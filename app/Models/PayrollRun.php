<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollRun extends Model
{
    use HasUuids;
    protected $connection = 'payroll';

    protected $fillable = [
        'pay_period_start', 'pay_period_end', 'pay_date', 'cutoff_label',
        'status', 'timesheet_submitted_at', 'archived_at',
        'total_employees', 'gross_total', 'deductions_total', 'net_total',
    ];

    protected function casts(): array
    {
        return [
            'pay_period_start' => 'date',
            'pay_period_end' => 'date',
            'pay_date' => 'date',
            'timesheet_submitted_at' => 'datetime',
            'archived_at' => 'datetime',
            'gross_total' => 'decimal:2',
            'deductions_total' => 'decimal:2',
            'net_total' => 'decimal:2',
        ];
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function anomalies(): HasMany
    {
        return $this->hasMany(PayrollAnomaly::class);
    }

    /** Once the timesheet is submitted, every row for this run is locked. */
    public function timesheetIsLocked(): bool
    {
        return $this->timesheet_submitted_at !== null;
    }

    /**
     * Weekday count for this run's actual pay period (cutoffs are 26-9 vs
     * 10-25, so this isn't a fixed constant). Used both to compute payroll
     * and as the "full attendance" default for manual timesheet entry.
     */
    public function workingDays(): int
    {
        $count = 0;
        $cursor = Carbon::parse($this->pay_period_start);
        $end = Carbon::parse($this->pay_period_end);

        while ($cursor->lte($end)) {
            if (! $cursor->isWeekend()) {
                $count++;
            }
            $cursor->addDay();
        }

        return max(1, $count); // guard against division by zero on malformed dates
    }

    /**
     * Weekday count from $from (clamped to the period start) through the
     * period end, inclusive. Used to prorate a mid-period hire's default
     * attendance days — unlike workingDays(), this is allowed to be 0
     * (e.g. someone hired after the period end).
     */
    public function workingDaysFrom(Carbon $from): int
    {
        $periodStart = Carbon::parse($this->pay_period_start);
        $cursor = $from->greaterThan($periodStart) ? $from->copy() : $periodStart->copy();
        $end = Carbon::parse($this->pay_period_end);

        $count = 0;
        while ($cursor->lte($end)) {
            if (! $cursor->isWeekend()) {
                $count++;
            }
            $cursor->addDay();
        }

        return $count;
    }
}