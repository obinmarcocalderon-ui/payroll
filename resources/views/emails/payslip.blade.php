<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; color: #16203a; background: #f6f7fb; padding: 24px; }
        .card { max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e7eaf3; border-radius: 12px; overflow: hidden; }
        .bar { height: 6px; background: #0f1a3d; }
        .content { padding: 24px; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .muted { color: #6b7590; font-size: 13px; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 4px; }
        td { padding: 3px 0; }
        .label { color: #6b7590; }
        .value { text-align: right; font-weight: 600; }
        .section-total td { border-top: 1px solid #e7eaf3; padding-top: 6px; margin-top: 2px; font-weight: 700; }
        .section-gap { height: 14px; }
        .remittance { background: #0f1a3d; color: #ffffff; padding: 12px 16px; border-radius: 8px; margin-top: 16px; display: flex; justify-content: space-between; font-weight: 700; }
    </style>
</head>
<body>
    <div class="card">
        <div class="bar"></div>
        <div class="content">
            <h1>Payslip — {{ $run->cutoffLabel ?? $run->cutoff_label }}</h1>
            <p class="muted">
                Pay period {{ $run->pay_period_start->format('M j, Y') }} – {{ $run->pay_period_end->format('M j, Y') }}
                &middot; Pay date {{ $run->pay_date->format('M j, Y') }}
            </p>

            <p>Hi {{ $payslip->employee_name }},</p>
            <p class="muted">Here is a summary of your pay for this period.</p>

            <table>
                <tr><td class="label">Basic Salary</td><td class="value">₱{{ number_format($payslip->basic_pay, 2) }}</td></tr>
                <tr><td class="label">Tax Refund</td><td class="value">₱{{ number_format($payslip->tax_refund, 2) }}</td></tr>
                <tr><td class="label">SL - Cash Conversion</td><td class="value">₱{{ number_format($payslip->sl_cash_conversion, 2) }}</td></tr>
                <tr><td class="label">Overtime Pay</td><td class="value">₱{{ number_format($payslip->overtime_pay, 2) }}</td></tr>
                <tr><td class="label">Absent/Undertime/Lates</td><td class="value">-₱{{ number_format($payslip->late_undertime_absence_deduction, 2) }}</td></tr>
                <tr class="section-total"><td>Total Salary</td><td class="value">₱{{ number_format($payslip->total_salary, 2) }}</td></tr>
            </table>

            <div class="section-gap"></div>
            <table>
                <tr><td class="label">SSS</td><td class="value">-₱{{ number_format($payslip->sss_contribution, 2) }}</td></tr>
                <tr><td class="label">PhilHealth</td><td class="value">-₱{{ number_format($payslip->philhealth_contribution, 2) }}</td></tr>
                <tr><td class="label">HDMF</td><td class="value">-₱{{ number_format($payslip->pagibig_contribution, 2) }}</td></tr>
                <tr class="section-total"><td>Taxable Salary</td><td class="value">₱{{ number_format($payslip->taxable_salary, 2) }}</td></tr>
            </table>

            <div class="section-gap"></div>
            <table>
                <tr><td class="label">Withholding Tax</td><td class="value">-₱{{ number_format($payslip->withholding_tax, 2) }}</td></tr>
                <tr><td class="label">Cash Advance</td><td class="value">-₱{{ number_format($payslip->cash_advance, 2) }}</td></tr>
                <tr><td class="label">SSS Loan</td><td class="value">-₱{{ number_format($payslip->sss_loan, 2) }}</td></tr>
                <tr><td class="label">HDMF Loan</td><td class="value">-₱{{ number_format($payslip->hdmf_loan, 2) }}</td></tr>
                <tr><td class="label">Company Loan</td><td class="value">-₱{{ number_format($payslip->company_loan_deduction, 2) }}</td></tr>
                <tr class="section-total"><td>Net Salary</td><td class="value">₱{{ number_format($payslip->net_salary, 2) }}</td></tr>
            </table>

            <div class="section-gap"></div>
            <table>
                <tr><td class="label">Transportation Allowance</td><td class="value">₱{{ number_format($payslip->transportation_allowance, 2) }}</td></tr>
                <tr><td class="label">Rice Subsidy Allowance</td><td class="value">₱{{ number_format($payslip->rice_subsidy_allowance, 2) }}</td></tr>
            </table>

            <div class="remittance">
                <span>Total Remittance</span>
                <span>₱{{ number_format($payslip->total_remittance, 2) }}</span>
            </div>

            <p class="muted" style="margin-top:20px;">
                This is a system-generated payslip. For questions, contact your HR administrator.
            </p>
        </div>
    </div>
</body>
</html>
