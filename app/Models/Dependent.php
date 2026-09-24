<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Dependent extends Model
{
    use HasUuids;
     protected $connection = 'benefits';

    protected $fillable = [
        'benefit_enrollment_id', 'full_name', 'relationship', 'birth_date',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
        ];
    }
}
