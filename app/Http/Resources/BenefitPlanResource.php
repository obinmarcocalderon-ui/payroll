<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BenefitPlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'planName' => $this->plan_name,
            'provider' => $this->provider,
            'planType' => $this->plan_type,
            'coverageAmount' => (float) $this->coverage_amount,
            'employerSharePercent' => (float) $this->employer_share_percent,
            'employeeSharePercent' => (float) $this->employee_share_percent,
            'isActive' => (bool) $this->is_active,
        ];
    }
}
