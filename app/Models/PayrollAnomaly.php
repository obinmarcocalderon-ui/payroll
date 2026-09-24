<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollAnomaly extends Model
{
    use HasUuids;
    protected $connection = 'payroll';

    public const SEVERITY_LOW = 'low';
    public const SEVERITY_MEDIUM = 'medium';
    public const SEVERITY_CRITICAL = 'critical';

    public const STATUS_UNRESOLVED = 'unresolved';
    public const STATUS_DISMISSED = 'dismissed';
    public const STATUS_NEEDS_CORRECTION = 'needs_correction';

    public const STATUSES = [self::STATUS_UNRESOLVED, self::STATUS_DISMISSED, self::STATUS_NEEDS_CORRECTION];

    protected $fillable = [
        'payroll_run_id', 'employee_id', 'employee_name',
        'anomaly_type', 'severity', 'description', 'suggested_action', 'metrics', 'status',
    ];

    protected function casts(): array
    {
        return [
            'metrics' => 'array',
        ];
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Whether this single flag, as currently reviewed, should block
     * approving its payroll run — see PayrollAnomalyDetector::blocksApproval().
     */
    public function blocksApproval(): bool
    {
        if ($this->status === self::STATUS_DISMISSED) {
            return false;
        }

        return $this->status === self::STATUS_NEEDS_CORRECTION || $this->severity === self::SEVERITY_CRITICAL;
    }
}
