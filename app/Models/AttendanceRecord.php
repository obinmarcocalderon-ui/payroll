<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    use HasUuids;
     protected $connection = 'attendance';

        protected $fillable = [
        'employee_id', 'payroll_run_id', 'date', 'status', 'timestamp_in', 'timestamp_out',
        'status_in', 'status_out', 'minutes_late', 'overtime_minutes', 'holiday_type',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'timestamp_in' => 'datetime',
            'timestamp_out' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
