<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EssVerificationCodeMail;
use App\Models\EssVerificationCode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

/**
 * Step-up 2FA gate for the Employee Self-Service area only — the main
 * Admin/HR dashboard never touches this. A signed-in user (any role) who
 * opens /ess/* must first verify a one-time code emailed to their account
 * address; once verified, the *current* Sanctum token is flagged, so it
 * persists across page reloads but resets on next login/logout.
 */
class EssTwoFactorController extends Controller
{
    private const CODE_LENGTH = 6;
    private const CODE_TTL_MINUTES = 10;

    public function status(Request $request)
    {
        $token = $request->user()->currentAccessToken();

        return response()->json([
            'verified' => (bool) ($token && $token->ess_verified_at),
        ]);
    }

    public function send(Request $request)
    {
        $user = $request->user();

        // Invalidate any codes still outstanding so only the latest one works.
        EssVerificationCode::where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $code = (string) random_int(0, 10 ** self::CODE_LENGTH - 1);
        $code = str_pad($code, self::CODE_LENGTH, '0', STR_PAD_LEFT);

        EssVerificationCode::create([
            'user_id' => $user->id,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::CODE_TTL_MINUTES),
            'created_at' => now(),
        ]);

        Mail::to($user->email)->send(new EssVerificationCodeMail($code, self::CODE_TTL_MINUTES));

        return response()->json([
            'message' => "A verification code was sent to {$user->email}.",
            'expiresInMinutes' => self::CODE_TTL_MINUTES,
        ]);
    }

    public function verify(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();

        $pending = EssVerificationCode::where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('id')
            ->first();

        if (! $pending || ! Hash::check($data['code'], $pending->code_hash)) {
            return response()->json([
                'message' => 'That code is incorrect or has expired. Request a new one.',
            ], 422);
        }

        $pending->update(['consumed_at' => now()]);

        $token = $request->user()->currentAccessToken();
        $token->forceFill(['ess_verified_at' => now()])->save();

        return response()->json(['verified' => true]);
    }
}
