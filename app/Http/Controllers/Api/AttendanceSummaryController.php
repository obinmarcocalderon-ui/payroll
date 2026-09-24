<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceSummaryResource;
use App\Models\AttendanceSummary;
use App\Models\Employee;
use App\Models\PayrollRun;
use Illuminate\Http\Request;

class AttendanceSummaryController extends Controller
{
    /**
     * List attendance summaries for a payroll run. If HR has already
     * entered/saved data for this run, those saved rows are returned.
     * Otherwise, every active employee is defaulted to "full attendance"
     * for the cutoff (present every working day, no lates/OT/absences)
     * as a starting point for manual entry — nothing is persisted until
     * HR actually edits and saves a row.
     */
    public function indexForRun(PayrollRun $payrollRun)
    {
        $saved = AttendanceSummary::where('payroll_run_id', $payrollRun->id)
            ->get()
            ->keyBy('employee_id');

        $fullAttendanceDays = $payrollRun->workingDays();

        $rows = Employee::where('employment_status', 'active')
            ->orderBy('last_name')
            ->get()
            ->map(function (Employee $employee) use ($payrollRun, $saved, $fullAttendanceDays) {
                if ($existing = $saved->get($employee->id)) {
                    return $existing;
                }

                $availableDays = $employee->date_hired && $employee->date_hired->gt($payrollRun->pay_period_start)
                    ? $payrollRun->workingDaysFrom($employee->date_hired)
                    : $fullAttendanceDays;

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
            });

        return AttendanceSummaryResource::collection($rows);
    }

    /**
     * Save (create or update) one employee's attendance/adjustments row
     * for this payroll run. Blocked once the run has moved past "draft"
     * — attendance for a computed run is considered final.
     */
    public function store(Request $request, PayrollRun $payrollRun)
    {
        if ($payrollRun->status !== 'draft') {
            return response()->json([
                'message' => 'Attendance for this payroll run is already final and can no longer be edited.',
            ], 422);
        }

        $data = $request->validate([
            'employeeId' => ['required', 'uuid', 'exists:employees,id'],
            'daysPresent' => ['required', 'numeric', 'min:0'],
            'lateMinutes' => ['required', 'numeric', 'min:0'],
            'overtimeHours' => ['required', 'numeric', 'min:0'],
            'unpaidAbsenceDays' => ['required', 'numeric', 'min:0'],
            'cashAdvance' => ['required', 'numeric', 'min:0'],
            'taxRefund' => ['required', 'numeric', 'min:0'],
            'slCashConversion' => ['required', 'numeric', 'min:0'],
        ]);

         $existing = AttendanceSummary::where('payroll_run_id', $payrollRun->id)
            ->where('employee_id', $data['employeeId'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'This attendance entry has already been saved and is locked from further changes.',
            ], 422);
        }

        $employee = Employee::findOrFail($data['employeeId']);

        $summary = AttendanceSummary::create(
            ['payroll_run_id' => $payrollRun->id, 'employee_id' => $data['employeeId']],
            [
                'employee_name' => "{$employee->first_name} {$employee->last_name}",
                'days_present' => $data['daysPresent'],
                'late_minutes' => $data['lateMinutes'],
                'overtime_hours' => $data['overtimeHours'],
                'unpaid_absence_days' => $data['unpaidAbsenceDays'],
                'cash_advance' => $data['cashAdvance'],
                'tax_refund' => $data['taxRefund'],
                'sl_cash_conversion' => $data['slCashConversion'],
            ]
        );

        return new AttendanceSummaryResource($summary);
    }
}