<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SalaryGrade extends Model
{
    use HasUuids;
     protected $connection = 'compensation';

    protected $fillable = [
        'grade_code', 'grade_name', 'min_salary', 'mid_salary', 'max_salary', 'applicable_positions',
    ];

    protected function casts(): array
    {
        return [
            'min_salary' => 'decimal:2',
            'mid_salary' => 'decimal:2',
            'max_salary' => 'decimal:2',
        ];
    }
}
