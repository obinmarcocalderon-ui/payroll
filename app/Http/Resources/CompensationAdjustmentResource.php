<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompensationAdjustmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employeeId' => $this->employee_id,
            'employeeName' => $this->employee_name,
            'adjustmentType' => $this->adjustment_type,
            'currentSalary' => (float) $this->current_salary,
            'proposedSalary' => (float) $this->proposed_salary,
            'effectiveDate' => $this->effective_date?->toDateString(),
            'justification' => $this->justification,
            'status' => $this->status,
            'requestedBy' => $this->requested_by,
            'requestedAt' => $this->requested_at?->toIso8601String(),
        ];
    }
}
