<?php

namespace App\Services;

use App\Models\AttendanceSummary;
use App\Models\Claim;
use App\Models\Employee;
use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use App\Models\Payslip;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Rule-based payroll anomaly detection — no trained model, just explicit
 * thresholds and comparisons, each one able to show the exact numbers that
 * triggered it (see the `metrics` + `description` on every flag). Runs
 * automatically at the end of PayrollRunController::compute() and on
 * demand via PayrollAnomalyController::rescan().
 *
 * Re-scanning is idempotent per (run, employee, anomaly type): a flag an
 * HR reviewer already dismissed or marked "needs correction" keeps that
 * status across a rescan (only its numbers refresh); a flag that no
 * longer reproduces is deleted.
 */
class PayrollAnomalyDetector
{
    private float $otThresholdHours;
    private float $payDeviationPercent;
    private int $lookbackCutoffs;

    public function __construct()
    {
        $this->otThresholdHours = (float) config('payroll.anomaly.ot_threshold_hours');
        $this->payDeviationPercent = (float) config('payroll.anomaly.pay_deviation_percent');
        $this->lookbackCutoffs = (int) config('payroll.anomaly.lookback_cutoffs');
    }

    public function scan(PayrollRun $run): Collection
    {
        $payslips = $run->payslips()->get();
        $attendanceByEmployee = AttendanceSummary::where('payroll_run_id', $run->id)
            ->get()
            ->keyBy('employee_id');
        $claimsByEmployee = Claim::whereBetween('date_incurred', [$run->pay_period_start, $run->pay_period_end])
            ->get()
            ->groupBy('employee_id');

        $detected = collect();

        foreach ($payslips as $payslip) {
            $employee = Employee::withTrashed()->find($payslip->employee_id);
            if (! $employee) {
                continue;
            }

            $attendance = $attendanceByEmployee->get($employee->id);
            $claims = $claimsByEmployee->get($employee->id, collect());

            $detected = $detected
                ->merge($this->checkSalaryDeviation($run, $employee, $payslip))
                ->merge($this->checkExcessiveOvertime($run, $employee, $attendance))
                ->merge($this->checkDuplicateClaims($run, $employee, $claims))
                ->merge($this->checkMissingStatutoryDeductions($run, $employee, $payslip))
                ->merge($this->checkNetPayError($run, $employee, $payslip))
                ->merge($this->checkProrationNeeded($run, $employee, $attendance));
        }

        return $this->persist($run, $detected);
    }

    private function checkSalaryDeviation(PayrollRun $run, Employee $employee, Payslip $payslip): array
    {
        $history = Payslip::where('employee_id', $employee->id)
            ->where('payroll_run_id', '!=', $run->id)
            ->whereHas('payrollRun', fn ($q) => $q->where('pay_period_start', '<', $run->pay_period_start))
            ->orderByDesc('created_at')
            ->limit($this->lookbackCutoffs)
            ->get();

        if ($history->isEmpty()) {
            return [];
        }

        $avgNet = (float) $history->avg('net_salary');
        if ($avgNet <= 0) {
            return [];
        }

        $currentNet = (float) $payslip->net_salary;
        $deviationPercent = abs($currentNet - $avgNet) / $avgNet * 100;

        if ($deviationPercent <= $this->payDeviationPercent) {
            return [];
        }

        $direction = $currentNet > $avgNet ? 'higher' : 'lower';

        return [$this->flag(
            $run,
            $employee,
            'unusual_pay_change',
            PayrollAnomaly::SEVERITY_MEDIUM,
            sprintf(
                'Net pay ₱%s is %.1f%% %s than this employee\'s ₱%s average over the last %d cutoff(s).',
                number_format($currentNet, 2),
                $deviationPercent,
                $direction,
                number_format($avgNet, 2),
                $history->count()
            ),
            'Confirm the change (raise, one-off deduction, or attendance difference) is intentional before approving.',
            [
                'netPay' => $currentNet,
                'averageNetPay' => round($avgNet, 2),
                'deviationPercent' => round($deviationPercent, 1),
                'thresholdPercent' => $this->payDeviationPercent,
                'cutoffsCompared' => $history->count(),
            ]
        )];
    }

    private function checkExcessiveOvertime(PayrollRun $run, Employee $employee, ?AttendanceSummary $attendance): array
    {
        if (! $attendance) {
            return [];
        }

        $otHours = (float) $attendance->overtime_hours;
        if ($otHours <= $this->otThresholdHours) {
            return [];
        }

        return [$this->flag(
            $run,
            $employee,
            'high_overtime',
            PayrollAnomaly::SEVERITY_MEDIUM,
            sprintf('OT: %.1f hrs vs. threshold %.1f hrs.', $otHours, $this->otThresholdHours),
            "Verify the overtime hours with the employee's supervisor or biometric logs before approving.",
            ['overtimeHours' => $otHours, 'thresholdHours' => $this->otThresholdHours]
        )];
    }

    private function checkDuplicateClaims(PayrollRun $run, Employee $employee, Collection $claims): array
    {
        $flags = [];

        foreach ($claims->groupBy('claim_type') as $claimType => $group) {
            if ($group->count() < 2) {
                continue;
            }

            $sorted = $group->sortBy('date_incurred')->values();
            $overlapping = collect([$sorted->first()]);

            for ($i = 0; $i < $sorted->count() - 1; $i++) {
                $current = Carbon::parse($sorted[$i]->date_incurred);
                $next = Carbon::parse($sorted[$i + 1]->date_incurred);

                if ($current->diffInDays($next) <= 1) {
                    $overlapping->push($sorted[$i + 1]);
                }
            }

            if ($overlapping->count() < 2) {
                continue;
            }

            $dates = $overlapping->pluck('date_incurred')
                ->map(fn ($d) => Carbon::parse($d)->format('M j'))
                ->unique()
                ->implode(', ');

            $flags[] = $this->flag(
                $run,
                $employee,
                'duplicate_claim',
                PayrollAnomaly::SEVERITY_MEDIUM,
                sprintf(
                    '%d "%s" claims submitted with the same/overlapping date (%s) totalling ₱%s.',
                    $overlapping->count(),
                    str_replace('_', ' ', $claimType),
                    $dates,
                    number_format($overlapping->sum('amount'), 2)
                ),
                'Review each claim before reimbursing — one may be a duplicate submission.',
                [
                    'claimType' => $claimType,
                    'claimIds' => $overlapping->pluck('id')->values()->all(),
                    'count' => $overlapping->count(),
                    'totalAmount' => (float) $overlapping->sum('amount'),
                    'dates' => $overlapping->pluck('date_incurred')->map(fn ($d) => (string) $d)->unique()->values()->all(),
                ]
            );
        }

        return $flags;
    }

    private function checkMissingStatutoryDeductions(PayrollRun $run, Employee $employee, Payslip $payslip): array
    {
        $gross = (float) $payslip->total_salary;
        if ($gross <= 0) {
            return [];
        }

        $missing = [];
        if ((float) $payslip->sss_contribution <= 0) {
            $missing[] = 'SSS';
        }
        if ((float) $payslip->philhealth_contribution <= 0) {
            $missing[] = 'PhilHealth';
        }
        if ((float) $payslip->pagibig_contribution <= 0) {
            $missing[] = 'HDMF';
        }

        if (empty($missing)) {
            return [];
        }

        return [$this->flag(
            $run,
            $employee,
            'missing_statutory_deduction',
            PayrollAnomaly::SEVERITY_MEDIUM,
            sprintf(
                '%s contribution%s ₱0 despite gross pay of ₱%s.',
                implode('/', $missing),
                count($missing) > 1 ? ' are' : ' is',
                number_format($gross, 2)
            ),
            'Confirm this employee is genuinely exempt, or correct the contribution computation before approving.',
            ['missing' => $missing, 'grossPay' => $gross]
        )];
    }

    private function checkNetPayError(PayrollRun $run, Employee $employee, Payslip $payslip): array
    {
        $net = (float) $payslip->net_salary;
        if ($net > 0) {
            return [];
        }

        return [$this->flag(
            $run,
            $employee,
            'net_pay_error',
            PayrollAnomaly::SEVERITY_CRITICAL,
            sprintf(
                'Net pay is ₱%s after deductions (gross ₱%s).',
                number_format($net, 2),
                number_format((float) $payslip->total_salary, 2)
            ),
            "Do not approve — review this employee's attendance and deductions, then recompute.",
            ['netPay' => $net, 'grossPay' => (float) $payslip->total_salary]
        )];
    }

    private function checkProrationNeeded(PayrollRun $run, Employee $employee, ?AttendanceSummary $attendance): array
    {
        if (! $attendance || ! $employee->date_hired) {
            return [];
        }

        $hiredMidCutoff = $employee->date_hired->gt($run->pay_period_start)
            && $employee->date_hired->lte($run->pay_period_end);

        if (! $hiredMidCutoff) {
            return [];
        }

        $isFirstCutoff = ! Payslip::where('employee_id', $employee->id)
            ->where('payroll_run_id', '!=', $run->id)
            ->exists();

        if (! $isFirstCutoff) {
            return [];
        }

        $expectedMaxDays = $run->workingDaysFrom($employee->date_hired);
        $daysPaid = (float) $attendance->days_present;

        if ($daysPaid <= $expectedMaxDays) {
            return [];
        }

        return [$this->flag(
            $run,
            $employee,
            'proration_check_needed',
            PayrollAnomaly::SEVERITY_LOW,
            sprintf(
                'Hired %s (mid-cutoff — only %d of %d working days available) but paid for %s day(s).',
                $employee->date_hired->format('M j, Y'),
                $expectedMaxDays,
                $run->workingDays(),
                number_format($daysPaid, 2)
            ),
            "Verify this first-cutoff pay was prorated from the hire date, not the full period.",
            [
                'hireDate' => $employee->date_hired->toDateString(),
                'expectedMaxDays' => $expectedMaxDays,
                'fullPeriodDays' => $run->workingDays(),
                'daysPaid' => $daysPaid,
            ]
        )];
    }

    /** @return array<string, mixed> */
    private function flag(
        PayrollRun $run,
        Employee $employee,
        string $type,
        string $severity,
        string $description,
        string $suggestedAction,
        array $metrics
    ): array {
        return [
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'employee_name' => "{$employee->first_name} {$employee->last_name}",
            'anomaly_type' => $type,
            'severity' => $severity,
            'description' => $description,
            'suggested_action' => $suggestedAction,
            'metrics' => $metrics,
        ];
    }

    /**
     * Upsert the freshly detected flags and drop any previously stored
     * flag that no longer reproduces — without touching the status of a
     * flag a human already reviewed (dismissed / needs_correction).
     */
    private function persist(PayrollRun $run, Collection $detected): Collection
    {
        return DB::transaction(function () use ($run, $detected) {
            $existing = PayrollAnomaly::where('payroll_run_id', $run->id)->get()
                ->keyBy(fn (PayrollAnomaly $a) => "{$a->employee_id}|{$a->anomaly_type}");

            $keepIds = [];

            $result = $detected->map(function (array $data) use ($existing, &$keepIds) {
                $key = "{$data['employee_id']}|{$data['anomaly_type']}";
                $current = $existing->get($key);

                if ($current) {
                    $current->update([
                        'employee_name' => $data['employee_name'],
                        'severity' => $data['severity'],
                        'description' => $data['description'],
                        'suggested_action' => $data['suggested_action'],
                        'metrics' => $data['metrics'],
                        // status intentionally left as-is — preserves HR's review decision
                    ]);
                    $keepIds[] = $current->id;

                    return $current;
                }

                $created = PayrollAnomaly::create($data + ['status' => PayrollAnomaly::STATUS_UNRESOLVED]);
                $keepIds[] = $created->id;

                return $created;
            });

            PayrollAnomaly::where('payroll_run_id', $run->id)->whereNotIn('id', $keepIds)->delete();

            return $result;
        });
    }
}
