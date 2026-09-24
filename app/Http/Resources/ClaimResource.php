<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClaimResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employeeId' => $this->employee_id,
            'employeeName' => $this->employee_name,
            'department' => $this->department,
            'claimType' => $this->claim_type,
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'dateIncurred' => $this->date_incurred?->toDateString(),
            'dateSubmitted' => $this->date_submitted?->toDateString(),
            'status' => $this->status,
            'attachmentName' => $this->attachment_name,
            'reviewerNote' => $this->reviewer_note,
        ];
    }
}
