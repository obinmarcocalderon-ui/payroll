<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Console\Command;

class ListUsers extends Command
{
    protected $signature = 'user:list';

    protected $description = 'List login accounts, their roles and linked employee numbers (read-only)';

    public function handle(): int
    {
        $users = User::orderBy('name')->get(['name', 'email', 'role', 'employee_id']);

        // Employees can live on a separate connection, so look them up separately.
        $numbers = Employee::whereIn('id', $users->pluck('employee_id')->filter()->all())
            ->pluck('employee_number', 'id');

        $rows = $users->map(fn (User $user) => [
            $user->name,
            $user->email,
            $user->role,
            $user->employee_id
                ? ($numbers[$user->employee_id] ?? '(linked employee not found)')
                : '- (sign in with email)',
        ])->all();

        $this->table(['Name', 'Email', 'Role', 'Employee ID'], $rows);

        return self::SUCCESS;
    }
}