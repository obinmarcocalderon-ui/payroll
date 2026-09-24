<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasUuids;

    protected $fillable = [
        'date', 'name', 'type',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }
}
