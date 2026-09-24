<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payrollRunId' => $this->payroll_run_id,
            'employeeId' => $this->employee_id,
            'employeeName' => $this->employee_name,
            'daysPresent' => (float) $this->days_present,
            'lateMinutes' => (int) $this->late_minutes,
            'overtimeHours' => (float) $this->overtime_hours,
            'unpaidAbsenceDays' => (float) $this->unpaid_absence_days,
            'cashAdvance' => (float) $this->cash_advance,
            'taxRefund' => (float) $this->tax_refund,
            'slCashConversion' => (float) $this->sl_cash_conversion,
            'isLocked' => $this->resource->exists,
        ];
    }
}
