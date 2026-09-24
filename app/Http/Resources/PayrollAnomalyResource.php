<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayrollAnomalyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payrollRunId' => $this->payroll_run_id,
            'employeeId' => $this->employee_id,
            'employeeName' => $this->employee_name,
            'anomalyType' => $this->anomaly_type,
            'severity' => $this->severity,
            'description' => $this->description,
            'suggestedAction' => $this->suggested_action,
            'metrics' => $this->metrics,
            'status' => $this->status,
            'blocksApproval' => $this->blocksApproval(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
