<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Console\Command;

class CreateUser extends Command
{
    protected $signature = 'user:create
        {name : Full name}
        {email : Account email (OTP codes for admin/HR are sent here)}
        {role : admin, hr_staff or employee}
        {--employee-number= : Employee ID to link this account to (required for the employee role)}
        {--password= : Password (prompted securely if omitted)}';

    protected $description = 'Create a login account, optionally linked to an employee record';

    public function handle(): int
    {
        $name = trim($this->argument('name'));
        $email = mb_strtolower(trim($this->argument('email')));
        $role = $this->argument('role');
        $employeeNumber = trim((string) $this->option('employee-number'));

        if (! in_array($role, User::ROLES, true)) {
            $this->error('Role must be one of: ' . implode(', ', User::ROLES));

            return self::FAILURE;
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('That is not a valid email address.');

            return self::FAILURE;
        }

        if (User::whereRaw('LOWER(email) = ?', [$email])->exists()) {
            $this->error('An account with that email already exists.');

            return self::FAILURE;
        }

        $employeeId = null;

        if ($employeeNumber !== '') {
            $employee = Employee::whereRaw('LOWER(employee_number) = ?', [mb_strtolower($employeeNumber)])->first();

            if (! $employee) {
                $this->error("No employee found with employee number '{$employeeNumber}'.");

                return self::FAILURE;
            }

            if (User::where('employee_id', $employee->id)->exists()) {
                $this->error('That employee already has a login account.');

                return self::FAILURE;
            }

            $employeeId = $employee->id;
        } elseif ($role === User::ROLE_EMPLOYEE) {
            $this->error('The employee role needs --employee-number so the account is linked to an employee record.');

            return self::FAILURE;
        }

        $password = $this->option('password') ?: $this->secret('Password (minimum 8 characters)');

        if (! is_string($password) || strlen($password) < 8) {
            $this->error('Password must be at least 8 characters.');

            return self::FAILURE;
        }

        User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt($password),
            'role' => $role,
            'employee_id' => $employeeId,
        ]);

        $this->info("Account created for {$email} ({$role}).");

        if ($employeeId === null) {
            $this->line('No employee link: this account signs in by typing its email in the Employee ID field.');
        }

        return self::SUCCESS;
    }
}