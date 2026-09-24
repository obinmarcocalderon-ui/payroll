<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employeeId' => $this->employee_id,
            'date' => $this->date?->toDateString(),
            'timestampIn' => $this->timestamp_in?->toIso8601String(),
            'timestampOut' => $this->timestamp_out?->toIso8601String(),
            'statusIn' => $this->status_in,
            'statusOut' => $this->status_out,
            'minutesLate' => (int) $this->minutes_late,
            'overtimeMinutes' => (int) $this->overtime_minutes,
                        'holidayType' => $this->holiday_type,
            'payrollRunId' => $this->payroll_run_id,
            'status' => $this->status,
            'isLocked' => $this->resource->exists,
        ];
    }
}
