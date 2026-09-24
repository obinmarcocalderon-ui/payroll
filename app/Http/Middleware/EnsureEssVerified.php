<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the Employee Self-Service endpoints behind the 2FA step-up in
 * EssTwoFactorController. Returns a distinct error code so the frontend
 * can tell "not verified yet" apart from a plain permission failure and
 * show the code-entry screen instead of a generic error.
 */
class EnsureEssVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if (! $token || ! $token->ess_verified_at) {
            return response()->json([
                'message' => 'Verify your identity to continue to Employee Self-Service.',
                'code' => 'ess_2fa_required',
            ], 403);
        }

        return $next($request);
    }
}
