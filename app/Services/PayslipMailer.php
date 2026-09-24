<?php

namespace App\Services;

use App\Mail\PayslipMail;
use App\Models\Employee;
use App\Models\Payslip;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PayslipMailer
{
    /**
     * Email a single payslip to the employee on file. Shared by the
     * manual "Send" action (PayslipController) and the automatic send
     * that fires when a payroll run is released (PayrollRunController).
     */
    public function sendEmail(Payslip $payslip, ?Employee $employee = null): array
    {
        $employee ??= Employee::withTrashed()->find($payslip->employee_id);

        if (! $employee || ! $employee->email) {
            return ['payslipId' => $payslip->id, 'status' => 'failed', 'message' => 'No email on file for this employee.'];
        }

        try {
            Mail::to($employee->email)->send(new PayslipMail($payslip));
            $payslip->update(['email_sent_at' => now()]);

            return ['payslipId' => $payslip->id, 'status' => 'sent', 'message' => "Emailed to {$employee->email}."];
        } catch (\Throwable $e) {
            Log::error('Payslip email failed', ['payslip_id' => $payslip->id, 'error' => $e->getMessage()]);

            return ['payslipId' => $payslip->id, 'status' => 'failed', 'message' => 'Email could not be sent.'];
        }
    }
}
