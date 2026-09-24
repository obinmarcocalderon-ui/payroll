<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BenefitPlan extends Model
{
    use HasUuids;
     protected $connection = 'benefits';

    protected $fillable = [
        'plan_name', 'provider', 'plan_type', 'coverage_amount',
        'employer_share_percent', 'employee_share_percent', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'coverage_amount' => 'decimal:2',
            'employer_share_percent' => 'decimal:2',
            'employee_share_percent' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(BenefitEnrollment::class, 'plan_id');
    }
}
