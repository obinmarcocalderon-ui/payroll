<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public int $expiresInMinutes)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->code} is your login verification code",
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'emails.admin-otp-code-plain',
            with: [
                'code' => $this->code,
                'expiresInMinutes' => $this->expiresInMinutes,
            ],
        );
    }
}