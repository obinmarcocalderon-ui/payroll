<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CompensationAdjustment extends Model
{
    use HasUuids;

    protected $fillable = [
        'employee_id', 'employee_name', 'adjustment_type', 'current_salary',
        'proposed_salary', 'effective_date', 'justification', 'status',
        'requested_by', 'requested_at',
    ];

    protected function casts(): array
    {
        return [
            'current_salary' => 'decimal:2',
            'proposed_salary' => 'decimal:2',
            'effective_date' => 'date',
            'requested_at' => 'datetime',
        ];
    }
}
