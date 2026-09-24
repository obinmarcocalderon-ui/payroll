<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayslipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payrollRunId' => $this->payroll_run_id,
            'employeeId' => $this->employee_id,
            'employeeNumber' => $this->employee_number,
            'employeeName' => $this->employee_name,
            'department' => $this->department,
            'basicPay' => (float) $this->basic_pay,
            'taxRefund' => (float) $this->tax_refund,
            'slCashConversion' => (float) $this->sl_cash_conversion,
            'overtimePay' => (float) $this->overtime_pay,
            'lateUndertimeAbsenceDeduction' => (float) $this->late_undertime_absence_deduction,
            'totalSalary' => (float) $this->total_salary,
            'sssContribution' => (float) $this->sss_contribution,
            'philHealthContribution' => (float) $this->philhealth_contribution,
            'hdmfContribution' => (float) $this->pagibig_contribution,
            'taxableSalary' => (float) $this->taxable_salary,
            'withholdingTax' => (float) $this->withholding_tax,
            'cashAdvance' => (float) $this->cash_advance,
            'sssLoan' => (float) $this->sss_loan,
            'hdmfLoan' => (float) $this->hdmf_loan,
            'companyLoanDeduction' => (float) $this->company_loan_deduction,
            'netSalary' => (float) $this->net_salary,
            'transportationAllowance' => (float) $this->transportation_allowance,
            'riceSubsidyAllowance' => (float) $this->rice_subsidy_allowance,
            'totalRemittance' => (float) $this->total_remittance,
            'status' => $this->status,
            'emailSentAt' => $this->email_sent_at?->toIso8601String(),
            'smsSentAt' => $this->sms_sent_at?->toIso8601String(),
        ];
    }
}
