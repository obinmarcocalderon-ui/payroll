<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Claim extends Model
{
    use HasUuids;
    protected $connection = 'claims';

    protected $fillable = [
        'employee_id', 'employee_name', 'department', 'claim_type', 'description',
        'amount', 'date_incurred', 'date_submitted', 'status', 'attachment_name', 'reviewer_note',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'date_incurred' => 'date',
            'date_submitted' => 'date',
        ];
    }
}
