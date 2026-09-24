<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyInternalApiKey
{
    /**
     * Verify that internal service-to-service requests carry the shared
     * internal API key. Distinct from Sanctum auth: this protects
     * machine-to-machine calls between our own "services," not user sessions.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $providedKey = $request->header('X-Internal-Api-Key');
        $expectedKey = config('services.internal_api_key');

        if (! $expectedKey || $providedKey !== $expectedKey) {
            return response()->json(['message' => 'Unauthorized internal request.'], 401);
        }

        return $next($request);
    }
}