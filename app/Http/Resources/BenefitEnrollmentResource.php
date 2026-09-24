<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BenefitEnrollmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employeeId' => $this->employee_id,
            'employeeName' => $this->employee_name,
            'planId' => $this->plan_id,
            'planName' => $this->plan_name,
            'status' => $this->status,
            'enrollmentDate' => $this->enrollment_date?->toDateString(),
            'dependents' => DependentResource::collection($this->whenLoaded('dependents', $this->dependents ?? [])),
        ];
    }
}
