<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ExpireIdleTokens
{
    private const IDLE_TIMEOUT_MINUTES = 30;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if ($token) {
            $cacheKey = "token_last_active:{$token->id}";
            $lastActive = Cache::get($cacheKey);

            if ($lastActive && now()->diffInMinutes($lastActive) > self::IDLE_TIMEOUT_MINUTES) {
                Cache::forget($cacheKey);
                $token->delete();

                return response()->json([
                    'message' => 'Your session has expired due to inactivity. Please sign in again.',
                ], 401);
            }

            Cache::put($cacheKey, now(), now()->addDay());
        }

        return $next($request);
    }
}
