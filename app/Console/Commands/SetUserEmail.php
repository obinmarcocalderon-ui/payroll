<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class SetUserEmail extends Command
{
    protected $signature = 'user:email
        {current : Current account email}
        {new : New email address (OTP codes are sent here)}';

    protected $description = 'Change the email of an existing login account';

    public function handle(): int
    {
        $current = mb_strtolower(trim($this->argument('current')));
        $new = mb_strtolower(trim($this->argument('new')));

        if (! filter_var($new, FILTER_VALIDATE_EMAIL)) {
            $this->error('That is not a valid email address.');

            return self::FAILURE;
        }

        $user = User::whereRaw('LOWER(email) = ?', [$current])->first();

        if (! $user) {
            $this->error('No account found with the current email.');

            return self::FAILURE;
        }

        if (User::whereRaw('LOWER(email) = ?', [$new])->where('id', '!=', $user->id)->exists()) {
            $this->error('Another account already uses that email.');

            return self::FAILURE;
        }

        $user->forceFill(['email' => $new])->save();

        $this->info("Email changed from {$current} to {$new}.");

        return self::SUCCESS;
    }
}