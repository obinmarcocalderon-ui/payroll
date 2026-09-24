<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class SetUserPassword extends Command
{
    protected $signature = 'user:password
        {email : Account email}
        {--password= : New password (prompted securely if omitted)}';

    protected $description = 'Reset the password of an existing login account';

    public function handle(): int
    {
        $email = mb_strtolower(trim($this->argument('email')));

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $user) {
            $this->error('No account found with that email.');

            return self::FAILURE;
        }

        $password = $this->option('password') ?: $this->secret('New password (minimum 8 characters)');

        if (! is_string($password) || strlen($password) < 8) {
            $this->error('Password must be at least 8 characters.');

            return self::FAILURE;
        }

        $user->forceFill(['password' => bcrypt($password)])->save();

        // Sign out any existing sessions so the old password stops working everywhere.
        $user->tokens()->delete();

        $this->info("Password updated for {$user->email}. Existing sessions were signed out.");

        return self::SUCCESS;
    }
}