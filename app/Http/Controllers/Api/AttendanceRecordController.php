<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ResolvesOwnEmployee;
use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceRecordResource;
use App\Http\Resources\PayrollRunResource;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\PayrollRun;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;

class AttendanceRecordController extends Controller
{
    use ResolvesOwnEmployee;

    private const TIMEZONE = 'Asia/Manila';
    private const GRACE_MINUTES = 15;

    public function today(Request $request)
    {
        $employee = $this->ownEmployee($request);
        $today = Carbon::now(self::TIMEZONE)->toDateString();

        $record = AttendanceRecord::where('employee_id', $employee->id)
            ->whereDate('date', $today)
            ->first();

        return response()->json([
            'record' => $record ? new AttendanceRecordResource($record) : null,
            'shiftStart' => $employee->shift_start,
            'shiftEnd' => $employee->shift_end,
            'holiday' => $this->holidayFor($today),
        ]);
    }

    public function clockIn(Request $request)
    {
        $employee = $this->ownEmployee($request);
        $today = Carbon::now(self::TIMEZONE)->toDateString();
        $now = Carbon::now();

        $record = AttendanceRecord::firstOrNew([
            'employee_id' => $employee->id,
            'date' => $today,
        ]);

        if ($record->exists && $record->timestamp_in) {
            return response()->json(['message' => 'You have already clocked in today.'], 422);
        }

        $shiftStart = Carbon::parse("{$today} {$employee->shift_start}", self::TIMEZONE);
        $graceDeadline = $shiftStart->copy()->addMinutes(self::GRACE_MINUTES);

        if ($now->lte($graceDeadline)) {
            $record->status_in = 'on_time';
            $record->minutes_late = 0;
        } else {
            $record->status_in = 'late';
            $record->minutes_late = (int) round($shiftStart->diffInMinutes($now));
        }

        $record->timestamp_in = $now;

        $holiday = $this->holidayFor($today);
        if ($holiday) {
            $record->holiday_type = $holiday['type'];
        }

        $record->save();

        return new AttendanceRecordResource($record);
    }

    public function clockOut(Request $request)
    {
        $employee = $this->ownEmployee($request);
        $today = Carbon::now(self::TIMEZONE)->toDateString();
        $now = Carbon::now();

        $record = AttendanceRecord::where('employee_id', $employee->id)
            ->whereDate('date', $today)
            ->first();

        if (! $record || ! $record->timestamp_in) {
            return response()->json(['message' => 'Clock in before clocking out.'], 422);
        }

        if ($record->timestamp_out) {
            return response()->json(['message' => 'You have already clocked out today.'], 422);
        }

        $shiftEnd = Carbon::parse("{$today} {$employee->shift_end}", self::TIMEZONE);

        if ($now->lte($shiftEnd)) {
            $record->status_out = 'on_time';
            $record->overtime_minutes = 0;
        } else {
            $record->status_out = 'overtime';
            $record->overtime_minutes = (int) round($shiftEnd->diffInMinutes($now));
        }

        $record->timestamp_out = $now;
        $record->save();

        return new AttendanceRecordResource($record);
    }

    public function history(Request $request)
    {
        $employee = $this->ownEmployee($request);

        return AttendanceRecordResource::collection(
            AttendanceRecord::where('employee_id', $employee->id)
                ->orderByDesc('date')
                ->limit(60)
                ->get()
        );
    }

    private function holidayFor(string $date): ?array
    {
        $holiday = Holiday::whereDate('date', $date)->first();

        if (! $holiday) {
            return null;
        }

        return ['name' => $holiday->name, 'type' => $holiday->type];
    }

    /**
     * The timesheet grid for one payroll run's cutoff: every active
     * employee × every day in the period. Saved rows come back as
     * AttendanceRecord; unsaved days are filled with an in-memory
     * "present" placeholder so the grid is never missing a cell.
     */
    public function indexForRun(PayrollRun $payrollRun)
    {
        $employees = Employee::where('employment_status', 'active')
            ->orderBy('last_name')
            ->get();

        $saved = AttendanceRecord::where('payroll_run_id', $payrollRun->id)
            ->get()
            ->groupBy('employee_id');

        $period = CarbonPeriod::create($payrollRun->pay_period_start, $payrollRun->pay_period_end);

        $sheet = [];
        foreach ($employees as $employee) {
            $existingByDate = ($saved->get($employee->id) ?? collect())->keyBy(
                fn ($r) => $r->date->toDateString()
            );

            $days = [];
            foreach ($period as $date) {
                $dateStr = $date->toDateString();
                if ($existing = $existingByDate->get($dateStr)) {
                    $days[] = $existing;
                } else {
                    $days[] = new AttendanceRecord([
                        'employee_id' => $employee->id,
                        'payroll_run_id' => $payrollRun->id,
                        'date' => $dateStr,
                        'status' => 'present',
                        'minutes_late' => 0,
                        'overtime_minutes' => 0,
                    ]);
                }
            }

            $sheet[] = [
                'employeeId' => $employee->id,
                'employeeName' => "{$employee->first_name} {$employee->last_name}",
                'days' => AttendanceRecordResource::collection($days),
            ];
        }

        return response()->json([
            'isLocked' => $payrollRun->timesheetIsLocked(),
            'timesheetSubmittedAt' => $payrollRun->timesheet_submitted_at?->toIso8601String(),
            'sheet' => $sheet,
        ]);
    }

    /**
     * Save one employee/day cell for this run's timesheet. Blocked once
     * that exact day was already saved (per-day guard, existing
     * behavior) and blocked entirely once the whole timesheet has been
     * submitted (run-level guard — see submit() below).
     */
    public function storeForRun(Request $request, PayrollRun $payrollRun)
    {
        if ($payrollRun->timesheetIsLocked()) {
            return response()->json([
                'message' => 'This timesheet was already submitted and is locked. It can no longer be edited.',
            ], 422);
        }

        $data = $request->validate([
            'employeeId' => ['required', 'uuid'],
            'date' => ['required', 'date'],
            'status' => ['required', 'in:present,absent,day_off'],
            'minutesLate' => ['nullable', 'integer', 'min:0'],
            'overtimeMinutes' => ['nullable', 'integer', 'min:0'],
        ]);

        $existing = AttendanceRecord::where('payroll_run_id', $payrollRun->id)
            ->where('employee_id', $data['employeeId'])
            ->whereDate('date', $data['date'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'This attendance day has already been saved and is locked from further changes.',
            ], 422);
        }

        $record = AttendanceRecord::create([
            'employee_id' => $data['employeeId'],
            'payroll_run_id' => $payrollRun->id,
            'date' => $data['date'],
            'status' => $data['status'],
            'minutes_late' => $data['minutesLate'] ?? 0,
            'overtime_minutes' => $data['overtimeMinutes'] ?? 0,
        ]);

        return new AttendanceRecordResource($record);
    }

    /**
     * Lock the whole timesheet for this run — mirrors Workforce
     * Management handing off a final DTR to Payroll: once submitted,
     * nothing on it can change. Requires at least one saved day so an
     * empty timesheet can't be locked in by mistake, and requires the
     * run still be a draft (payroll hasn't been computed yet).
     */
    public function submit(PayrollRun $payrollRun)
    {
        if ($payrollRun->status !== 'draft') {
            return response()->json([
                'message' => 'Only a draft payroll run has a timesheet to submit.',
            ], 422);
        }

        if ($payrollRun->timesheetIsLocked()) {
            return response()->json([
                'message' => 'This timesheet was already submitted.',
            ], 422);
        }

        $rowCount = AttendanceRecord::where('payroll_run_id', $payrollRun->id)->count();

        if ($rowCount === 0) {
            return response()->json([
                'message' => 'Record attendance for at least one employee before submitting the timesheet.',
            ], 422);
        }

        $payrollRun->update(['timesheet_submitted_at' => now()]);

        return new PayrollRunResource($payrollRun->fresh());
    }

    public function showViaInternalApi(AttendanceRecord $attendanceRecord)
    {
        $response = \Illuminate\Support\Facades\Http::withHeaders([
            'X-Internal-Api-Key' => config('services.internal_api_key'),
        ])->timeout(5)->retry(2, 200)->get(config('app.url').'/api/internal/employees/'.$attendanceRecord->employee_id);

        if (! $response->successful()) {
            return response()->json([
                'message' => 'Employee service unavailable.',
                'status' => $response->status(),
            ], 502);
        }

        return response()->json([
            'attendanceRecord' => new AttendanceRecordResource($attendanceRecord),
            'employee_via_internal_api' => $response->json(),
        ]);
    }

    /**
     * Read-only, date-range attendance summary (not tied to a payroll
     * run) — used by the Employees page "Attendance" tab.
     */
    public function summaryForPeriod(Request $request)
    {
        $request->validate([
            'start' => ['required', 'date'],
            'end' => ['required', 'date', 'after_or_equal:start'],
        ]);

        $start = $request->query('start');
        $end = $request->query('end');

        $employees = Employee::where('employment_status', 'active')
            ->orderBy('last_name')
            ->get();

        $records = AttendanceRecord::whereBetween('date', [$start, $end])
            ->get()
            ->groupBy('employee_id');

        $summary = [];
        foreach ($employees as $employee) {
            $days = $records->get($employee->id) ?? collect();

            $summary[] = [
                'employeeId' => $employee->id,
                'employeeName' => "{$employee->first_name} {$employee->last_name}",
                'daysPresent' => $days->where('status', 'present')->count(),
                'daysAbsent' => $days->where('status', 'absent')->count(),
                'daysOff' => $days->where('status', 'day_off')->count(),
                'totalMinutesLate' => (int) $days->sum('minutes_late'),
                'totalOvertimeMinutes' => (int) $days->sum('overtime_minutes'),
            ];
        }

        return response()->json($summary);
    }
}