<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SalaryGradeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'gradeCode' => $this->grade_code,
            'gradeName' => $this->grade_name,
            'minSalary' => (float) $this->min_salary,
            'midSalary' => (float) $this->mid_salary,
            'maxSalary' => (float) $this->max_salary,
            'applicablePositions' => $this->applicable_positions,
        ];
    }
}
