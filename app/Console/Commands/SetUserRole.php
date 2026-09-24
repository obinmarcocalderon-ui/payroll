<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class SetUserRole extends Command
{
    protected $signature = 'user:role
        {email : Account email}
        {role : admin, hr_staff or employee}';

    protected $description = 'Change the role of an existing login account';

    public function handle(): int
    {
        $email = mb_strtolower(trim($this->argument('email')));
        $role = $this->argument('role');

        if (! in_array($role, User::ROLES, true)) {
            $this->error('Role must be one of: ' . implode(', ', User::ROLES));

            return self::FAILURE;
        }

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $user) {
            $this->error('No account found with that email.');

            return self::FAILURE;
        }

        $old = $user->role;
        $user->forceFill(['role' => $role])->save();

        $this->info("{$user->email}: role changed from '{$old}' to '{$role}'.");

        return self::SUCCESS;
    }
}