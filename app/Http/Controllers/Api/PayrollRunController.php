<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PayrollRunResource;
use App\Services\AttendanceCalculator;
use App\Models\Employee;
use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\PayrollAnomalyDetector;
use App\Services\PayslipMailer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollRunController extends Controller
{
    public function __construct(private PayslipMailer $mailer, private PayrollAnomalyDetector $anomalyDetector, private AttendanceCalculator $attendanceCalculator)
    {
    }

    /**
     * Eager-loads the two anomaly counts every list/detail view needs for
     * the "⚠️ X anomalies detected" badge and the Approve-button gate,
     * without an extra query per run.
     */
    private function withAnomalyCounts(Builder $query): Builder
    {
        return $query->withCount([
            // "Unresolved" = anything still needing eyes on it, i.e. not dismissed.
            'anomalies as unresolved_anomalies_count' => fn ($q) => $q->where('status', '!=', PayrollAnomaly::STATUS_DISMISSED),
            // "Blocking" = what actually disables Approve — a critical flag
            // that hasn't been dismissed, or anything marked needs_correction.
            'anomalies as blocking_anomalies_count' => fn ($q) => $q->where('status', '!=', PayrollAnomaly::STATUS_DISMISSED)
                ->where(fn ($q2) => $q2->where('severity', PayrollAnomaly::SEVERITY_CRITICAL)->orWhere('status', PayrollAnomaly::STATUS_NEEDS_CORRECTION)),
        ]);
    }

    public function index(Request $request)
    {
        $query = $this->withAnomalyCounts(PayrollRun::query())->orderByDesc('created_at');

        if (! $request->boolean('includeArchived')) {
            $query->whereNull('archived_at');
        }

        return PayrollRunResource::collection($query->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'payPeriodStart' => ['required', 'date'],
            'payPeriodEnd' => ['required', 'date', 'after_or_equal:payPeriodStart'],
            'payDate' => ['required', 'date'],
            'cutoffLabel' => ['required', 'string', 'max:255'],
        ]);

        $run = PayrollRun::create([
            'pay_period_start' => $data['payPeriodStart'],
            'pay_period_end' => $data['payPeriodEnd'],
            'pay_date' => $data['payDate'],
            'cutoff_label' => $data['cutoffLabel'],
            'status' => 'draft',
        ]);

        return new PayrollRunResource($run);
    }

    public function show(PayrollRun $payrollRun)
    {
        return new PayrollRunResource(
            $this->withAnomalyCounts(PayrollRun::query())->findOrFail($payrollRun->id)
        );
    }

    /**
     * Compute payslips for every active employee based on the attendance
     * summaries entered for this run, then move the run to "for_approval".
     *
     * Line items and flow match the client's actual payslip format:
     *   Basic Salary + Tax Refund + SL-Cash Conversion + Overtime Pay
     *     - Absent/Undertime/Lates = Total Salary
     *   Total Salary - SSS - PhilHealth - HDMF = Taxable Salary
     *   Taxable Salary - Withholding Tax - Cash Advance - SSS Loan
     *     - HDMF Loan - Company Loan = Net Salary
     *   Net Salary + Transportation Allowance + Rice Subsidy Allowance
     *     = Total Remittance
     *
     * Per client feedback (client interview, semi-monthly payroll):
     * - Cutoffs run 26th-9th (paid the 15th) and 10th-25th (paid the
     *   30th/31st) — cutoff lengths differ, so "working days" is derived
     *   from the actual pay_period_start/end of each run (weekdays only)
     *   rather than a fixed constant.
     * - A 15-minute grace period applies before lateness is deducted.
     * - Employees may have recurring per-cutoff amounts (company loan,
     *   SSS loan, HDMF loan, transportation/rice subsidy allowances) —
     *   see the corresponding columns on the Employee model. Cash
     *   Advance, Tax Refund, and SL-Cash Conversion are one-off instead,
     *   entered per run on the attendance summary.
     *
     * NOT IMPLEMENTED: the client's slip itemizes overtime into Reg OT /
     * Sun OT / Hol-ND OT, each carrying a different legally-mandated
     * premium rate. Those rates weren't confirmed as of this build, so
     * overtime stays a single entered value at a flat 1.25x — same
     * "simplified, not the official figures" caveat as the statutory
     * rates below.
     *
     * NOTE ON STATUTORY RATES: SSS / PhilHealth / HDMF / withholding tax
     * below still use simplified flat percentages for demonstration.
     * They are NOT the official, bracketed government contribution
     * tables (those change periodically and have income brackets/caps).
     * Swap the constants in this method for the actual current tables
     * before using this for real payroll — the client has these on file
     * but hadn't confirmed the exact bracket figures as of this build.
     */
    public function compute(PayrollRun $payrollRun)
    {
        if ($payrollRun->status !== 'draft') {
            return response()->json([
                'message' => 'Only a draft payroll run can be computed. Create a new run instead.',
            ], 422);
        }

        if (! $payrollRun->timesheetIsLocked()) {
            return response()->json([
                'message' => 'Submit and lock the timesheet for this cutoff before computing payroll.',
            ], 422);
        }

        // Simplified statutory rates — see NOTE above.
        $sssRate = 0.045;        // 4.5% of Total Salary, employee share (simplified)
        $philhealthRate = 0.025; // 2.5% of Total Salary, employee share (simplified)
        $pagibigRate = 0.02;     // 2% of Total Salary, capped (this is what the client calls "HDMF")
        $pagibigCap = 100.0;
        $taxableThreshold = 20833.0; // simplified TRAIN-law-style monthly exemption
        $taxRate = 0.10;

        // Per client: 15-minute grace period before lateness is deducted.
        $lateGraceMinutes = 15;

        // Working days for this specific cutoff, derived from its actual
        // dates (weekdays only) — cutoffs are not a fixed length (26-9 vs
        // 10-25), so this can't be a hardcoded constant.
        $workingDaysPerPeriod = $payrollRun->workingDays();

        $summaries = $this->attendanceCalculator->forPayrollRun($payrollRun)->values();

        if ($summaries->isEmpty()) {
            return response()->json([
                'message' => 'No active employees to compute payroll for.',
            ], 422);
        }

        DB::transaction(function () use ($payrollRun, $summaries, $workingDaysPerPeriod, $lateGraceMinutes, $sssRate, $philhealthRate, $pagibigRate, $pagibigCap, $taxableThreshold, $taxRate) {
            // Clear any previously computed payslips for this run (recompute).
            Payslip::where('payroll_run_id', $payrollRun->id)->delete();

            $totalSalaryTotal = 0;
            $totalRemittanceTotal = 0;
            $deductionsTotal = 0;

            foreach ($summaries as $summary) {
                $employee = Employee::find($summary->employee_id);
                if (! $employee) {
                    continue;
                }

                $dailyRate = ((float) $employee->base_salary) / 2 / $workingDaysPerPeriod;
                $hourlyRate = $dailyRate / 8;

                $basicPay = round($dailyRate * (float) $summary->days_present, 2);
                $overtimePay = round($hourlyRate * 1.25 * (float) $summary->overtime_hours, 2);
                $taxRefund = round((float) $summary->tax_refund, 2);
                $slCashConversion = round((float) $summary->sl_cash_conversion, 2);

                $lateMinutesBeyondGrace = max(0, (int) $summary->late_minutes - $lateGraceMinutes);
                $lateDeduction = round(($hourlyRate / 60) * $lateMinutesBeyondGrace, 2);
                $absenceDeduction = round($dailyRate * (float) $summary->unpaid_absence_days, 2);
                $lateUndertimeAbsenceDeduction = round($lateDeduction + $absenceDeduction, 2);

                $totalSalary = max(0, $basicPay + $taxRefund + $slCashConversion + $overtimePay - $lateUndertimeAbsenceDeduction);

                $sss = round($totalSalary * $sssRate, 2);
                $philhealth = round($totalSalary * $philhealthRate, 2);
                $hdmf = min(round($totalSalary * $pagibigRate, 2), $pagibigCap);
                $taxableSalary = max(0, round($totalSalary - $sss - $philhealth - $hdmf, 2));

                $taxableIncomeOverThreshold = max(0, $taxableSalary - $taxableThreshold);
                $withholdingTax = round($taxableIncomeOverThreshold * $taxRate, 2);

                $cashAdvance = round((float) $summary->cash_advance, 2);
                $sssLoan = round((float) $employee->sss_loan_per_cutoff, 2);
                $hdmfLoan = round((float) $employee->hdmf_loan_per_cutoff, 2);
                $companyLoan = round((float) $employee->loan_deduction_per_cutoff, 2);

                $netSalary = max(0, round($taxableSalary - $withholdingTax - $cashAdvance - $sssLoan - $hdmfLoan - $companyLoan, 2));

                $transportationAllowance = round((float) $employee->transportation_allowance, 2);
                $riceSubsidyAllowance = round((float) $employee->rice_subsidy_allowance, 2);
                $totalRemittance = round($netSalary + $transportationAllowance + $riceSubsidyAllowance, 2);

                Payslip::create([
                    'payroll_run_id' => $payrollRun->id,
                    'employee_id' => $employee->id,
                    'employee_number' => $employee->employee_number,
                    'employee_name' => "{$employee->first_name} {$employee->last_name}",
                    'department' => $employee->department,
                    'basic_pay' => $basicPay,
                    'tax_refund' => $taxRefund,
                    'sl_cash_conversion' => $slCashConversion,
                    'overtime_pay' => $overtimePay,
                    'late_undertime_absence_deduction' => $lateUndertimeAbsenceDeduction,
                    'total_salary' => $totalSalary,
                    'sss_contribution' => $sss,
                    'philhealth_contribution' => $philhealth,
                    'pagibig_contribution' => $hdmf,
                    'taxable_salary' => $taxableSalary,
                    'withholding_tax' => $withholdingTax,
                    'cash_advance' => $cashAdvance,
                    'sss_loan' => $sssLoan,
                    'hdmf_loan' => $hdmfLoan,
                    'company_loan_deduction' => $companyLoan,
                    'net_salary' => $netSalary,
                    'transportation_allowance' => $transportationAllowance,
                    'rice_subsidy_allowance' => $riceSubsidyAllowance,
                    'total_remittance' => $totalRemittance,
                    'status' => 'computed',
                ]);

                $totalSalaryTotal += $totalSalary;
                $deductionsTotal += round($totalSalary - $netSalary, 2);
                $totalRemittanceTotal += $totalRemittance;
            }

            $payrollRun->update([
                'status' => 'for_approval',
                'total_employees' => $summaries->count(),
                'gross_total' => round($totalSalaryTotal, 2),
                'deductions_total' => round($deductionsTotal, 2),
                'net_total' => round($totalRemittanceTotal, 2),
            ]);
        });

        // AI-powered anomaly scan — runs automatically on every (re)compute,
        // before the run reaches HR/Admin for approval. See
        // PayrollAnomalyDetector for the rule set.
        $this->anomalyDetector->scan($payrollRun->fresh());

        return new PayrollRunResource(
            $this->withAnomalyCounts(PayrollRun::query())->findOrFail($payrollRun->id)
        );
    }

    /**
     * Blocked while any unresolved/needs-correction critical anomaly (or
     * any anomaly explicitly marked "needs correction", regardless of
     * severity) remains on this run — see PayrollAnomaly::blocksApproval().
     * HR/Admin clears the block from the anomaly panel by dismissing the
     * flag (false positive) or fixing the data and recomputing/rescanning.
     */
    public function approve(PayrollRun $payrollRun)
    {
        $blocking = $payrollRun->anomalies()->get()->filter(fn (PayrollAnomaly $a) => $a->blocksApproval());

        if ($blocking->isNotEmpty()) {
            return response()->json([
                'message' => "This run has {$blocking->count()} unresolved anomaly flag(s) that must be dismissed or corrected before approval.",
                'blockingAnomalies' => $blocking->count(),
            ], 422);
        }

        $payrollRun->update(['status' => 'approved']);

        return new PayrollRunResource($payrollRun);
    }

    /**
     * Releasing a run is also the point payslips get emailed out
     * automatically — no manual "Send" click needed for the normal case.
     * Only active employees with an email on file are emailed; the
     * per-payslip Send button in PayslipController still works for
     * resends (e.g. a bounced address, or a correction after release).
     */
    public function release(Request $request, PayrollRun $payrollRun)
    {
        $payrollRun->update(['status' => 'released']);

        $employees = Employee::whereIn('id', $payrollRun->payslips->pluck('employee_id'))
            ->get()
            ->keyBy('id');

        $emailed = 0;
        $failed = 0;

        foreach ($payrollRun->payslips as $payslip) {
            $payslip->update(['status' => 'released']);

            $employee = $employees->get($payslip->employee_id);
            if ($employee && $employee->employment_status === 'active' && $employee->email) {
                $result = $this->mailer->sendEmail($payslip, $employee);
                $result['status'] === 'sent' ? $emailed++ : $failed++;
            }
        }

        return response()->json(array_merge(
            (new PayrollRunResource($payrollRun->fresh()))->toArray($request),
            ['emailSummary' => ['emailed' => $emailed, 'failed' => $failed]]
        ));
    }

    /**
     * Archive a run — hides it from the default list without deleting its
     * records, so payroll history stays intact for audit purposes.
     */
    public function archive(PayrollRun $payrollRun)
    {
        $payrollRun->update(['archived_at' => now()]);

        return new PayrollRunResource($payrollRun);
    }

    public function unarchive(PayrollRun $payrollRun)
    {
        $payrollRun->update(['archived_at' => null]);

        return new PayrollRunResource($payrollRun);
    }

    /**
     * Only draft runs can be deleted outright — nothing has been computed
     * or approved yet, so there's no financial record to preserve.
     * Anything past draft should be archived instead.
     */
    public function destroy(PayrollRun $payrollRun)
    {
        if ($payrollRun->status !== 'draft') {
            return response()->json([
                'message' => 'Only a draft payroll run can be deleted. Archive this run instead to keep its records.',
            ], 422);
        }

        $payrollRun->delete();

        return response()->json(null, 204);
    }
}