<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; color: #16203a; background: #f6f7fb; padding: 24px; }
        .card { max-width: 420px; margin: 0 auto; background: #ffffff; border: 1px solid #e7eaf3; border-radius: 12px; overflow: hidden; }
        .bar { height: 6px; background: #0f1a3d; }
        .content { padding: 24px; text-align: center; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .muted { color: #6b7590; font-size: 13px; margin: 0 0 20px; }
        .code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f1a3d; background: #f6f7fb; border-radius: 8px; padding: 16px 0; margin: 0 0 20px; }
        .footnote { color: #6b7590; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="bar"></div>
        <div class="content">
            <h1>Employee Self-Service verification</h1>
            <p class="muted">Enter this code to continue to your employee dashboard.</p>
            <div class="code">{{ $code }}</div>
            <p class="muted">This code expires in {{ $expiresInMinutes }} minutes.</p>
            <p class="footnote">
                If you didn't request this, you can ignore this email — someone may have
                mistyped your email address. Your account is still safe.
            </p>
        </div>
    </div>
</body>
</html>
