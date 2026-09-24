<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Employee;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Self-service ("my own data") endpoints must never trust a client-supplied
 * employee id — the linked employee always comes from the authenticated
 * user's own account, so one employee can't read or write another's records.
 */
trait ResolvesOwnEmployee
{
    protected function ownEmployee(Request $request): Employee
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            throw new HttpException(403, "Your account isn't linked to an employee record.");
        }

        return $employee;
    }
}
