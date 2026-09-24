<?php

return [
    /*
     * Defaults to "log" so payslip emails work out of the box in Docker
     * without any SMTP setup — sent mail is written to
     * storage/logs/laravel.log instead of actually being delivered.
     * To send real emails, set MAIL_MAILER=smtp in .env and fill in
     * MAIL_HOST / MAIL_PORT / MAIL_USERNAME / MAIL_PASSWORD (e.g. from
     * Gmail SMTP, Mailgun, SendGrid, or your own mail server).
     */
    'default' => env('MAIL_MAILER', 'log'),

    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME'),
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 2525),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],
    ],

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'noreply@payroll-benefits.local'),
        'name' => env('MAIL_FROM_NAME', 'Payroll & Benefits'),
    ],
];
