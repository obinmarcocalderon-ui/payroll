<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payslip extends Model
{
    use HasUuids;
    protected $connection = 'payroll';

    protected $fillable = [
        'payroll_run_id', 'employee_id', 'employee_number', 'employee_name', 'department',
        'basic_pay', 'tax_refund', 'sl_cash_conversion', 'overtime_pay',
        'late_undertime_absence_deduction', 'total_salary',
        'sss_contribution', 'philhealth_contribution', 'pagibig_contribution', 'taxable_salary',
        'withholding_tax', 'cash_advance', 'sss_loan', 'hdmf_loan', 'company_loan_deduction', 'net_salary',
        'transportation_allowance', 'rice_subsidy_allowance', 'total_remittance',
        'status', 'email_sent_at', 'sms_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'basic_pay' => 'decimal:2',
            'tax_refund' => 'decimal:2',
            'sl_cash_conversion' => 'decimal:2',
            'overtime_pay' => 'decimal:2',
            'late_undertime_absence_deduction' => 'decimal:2',
            'total_salary' => 'decimal:2',
            'sss_contribution' => 'decimal:2',
            'philhealth_contribution' => 'decimal:2',
            'pagibig_contribution' => 'decimal:2',
            'taxable_salary' => 'decimal:2',
            'withholding_tax' => 'decimal:2',
            'cash_advance' => 'decimal:2',
            'sss_loan' => 'decimal:2',
            'hdmf_loan' => 'decimal:2',
            'company_loan_deduction' => 'decimal:2',
            'net_salary' => 'decimal:2',
            'transportation_allowance' => 'decimal:2',
            'rice_subsidy_allowance' => 'decimal:2',
            'total_remittance' => 'decimal:2',
            'email_sent_at' => 'datetime',
            'sms_sent_at' => 'datetime',
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
}
