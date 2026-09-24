<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BenefitEnrollment extends Model
{
    use HasUuids;
     protected $connection = 'benefits';

    protected $fillable = [
        'employee_id', 'employee_name', 'plan_id', 'plan_name', 'status', 'enrollment_date',
    ];

    protected function casts(): array
    {
        return [
            'enrollment_date' => 'date',
        ];
    }

    public function dependents(): HasMany
    {
        return $this->hasMany(Dependent::class);
    }
}
