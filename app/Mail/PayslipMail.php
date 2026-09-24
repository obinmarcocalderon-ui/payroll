<?php

namespace App\Mail;

use App\Models\Payslip;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PayslipMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Payslip $payslip)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Your Payslip — {$this->payslip->payrollRun->cutoffLabel}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payslip',
            with: [
                'payslip' => $this->payslip,
                'run' => $this->payslip->payrollRun,
            ],
        );
    }
}
