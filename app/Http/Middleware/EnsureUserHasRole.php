<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route-level role authorization. Usage:
 *
 *   Route::middleware('role:admin')->group(...);
 *   Route::middleware('role:admin,hr_staff')->group(...);
 *
 * Must run after the 'auth:sanctum' middleware so the user is
 * resolved. Returns 403 JSON for authenticated users whose role is
 * not in the allowed list — never leaks which roles exist.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasRole(...$roles)) {
            return response()->json([
                'message' => 'You do not have permission to perform this action.',
            ], 403);
        }

        return $next($request);
    }
}