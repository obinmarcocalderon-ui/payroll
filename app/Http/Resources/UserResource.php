<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'fullName' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'employeeId' => $this->employee_id,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
