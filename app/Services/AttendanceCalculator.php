<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSummary;
use App\Models\Employee;
use App\Models\PayrollRun;
use Illuminate\Support\Collection;

/**
 * Derives attendance data for payroll from the HR-entered timesheet
 * (AttendanceRecord rows scoped to this payroll_run_id, one per
 * employee per day, each with a status of present/absent/day_off — see
 * AttendanceRecordController::storeForRun()). The timesheet must be
 * submitted/locked (PayrollRun::timesheetIsLocked()) before compute()
 * will call this, so what's read here is always final.
 *
 * An employee with no timesheet rows at all for this run (shouldn't
 * normally happen once the timesheet is locked, but guards against a
 * hire added after submission) falls back to the "full attendance"
 * assumption, since there's no other source of truth for them.
 *
 * Nothing here is persisted — every call recomputes live from
 * AttendanceRecord.
 */
class AttendanceCalculator
{
    /**
     * One (unsaved) AttendanceSummary per active employee, keyed by
     * employee_id.
     *
     * @return Collection<string, AttendanceSummary>
     */
    public function forPayrollRun(PayrollRun $payrollRun): Collection
    {
        $fullAttendanceDays = $payrollRun->workingDays();

        $recordsByEmployee = AttendanceRecord::where('payroll_run_id', $payrollRun->id)
            ->get()
            ->groupBy('employee_id');

        return Employee::where('employment_status', 'active')
            ->orderBy('last_name')
            ->get()
            ->keyBy('id')
            ->map(fn (Employee $employee) => $this->forEmployee($payrollRun, $employee, $fullAttendanceDays, $recordsByEmployee->get($employee->id)));
    }

    private function forEmployee(PayrollRun $payrollRun, Employee $employee, int $fullAttendanceDays, ?Collection $records): AttendanceSummary
    {
        $availableDays = $employee->date_hired && $employee->date_hired->gt($payrollRun->pay_period_start)
            ? $payrollRun->workingDaysFrom($employee->date_hired)
            : $fullAttendanceDays;

        if ($records && $records->isNotEmpty()) {
            $daysPresent = $records->where('status', 'present')->count();
            $unpaidAbsenceDays = $records->where('status', 'absent')->count();

            return new AttendanceSummary([
                'payroll_run_id' => $payrollRun->id,
                'employee_id' => $employee->id,
                'employee_name' => "{$employee->first_name} {$employee->last_name}",
                'days_present' => $daysPresent,
                'late_minutes' => $records->sum('minutes_late'),
                'overtime_hours' => round($records->sum('overtime_minutes') / 60, 2),
                'unpaid_absence_days' => $unpaidAbsenceDays,
                'cash_advance' => 0,
                'tax_refund' => 0,
                'sl_cash_conversion' => 0,
            ]);
        }

        return new AttendanceSummary([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $employee->id,
            'employee_name' => "{$employee->first_name} {$employee->last_name}",
            'days_present' => $availableDays,
            'late_minutes' => 0,
            'overtime_hours' => 0,
            'unpaid_absence_days' => 0,
            'cash_advance' => 0,
            'tax_refund' => 0,
            'sl_cash_conversion' => 0,
        ]);
    }
}