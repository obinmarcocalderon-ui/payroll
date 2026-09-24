<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employeeNumber' => $this->employee_number,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'department' => $this->department,
            'position' => $this->position,
            'employmentStatus' => $this->employment_status,
            'employmentType' => $this->employment_type,
            'civilStatus' => $this->civil_status,
            'dateHired' => $this->date_hired?->toDateString(),
            'baseSalary' => (float) $this->base_salary,
            'shiftStart' => $this->shift_start,
            'shiftEnd' => $this->shift_end,
            'sssNumber' => $this->sss_number,
            'philhealthNumber' => $this->philhealth_number,
            'pagibigNumber' => $this->pagibig_number,
            'tinNumber' => $this->tin_number,
            'loanDeductionPerCutoff' => (float) $this->loan_deduction_per_cutoff,
            'transportationAllowance' => (float) $this->transportation_allowance,
            'riceSubsidyAllowance' => (float) $this->rice_subsidy_allowance,
            'sssLoanPerCutoff' => (float) $this->sss_loan_per_cutoff,
            'hdmfLoanPerCutoff' => (float) $this->hdmf_loan_per_cutoff,
        ];
    }
}
