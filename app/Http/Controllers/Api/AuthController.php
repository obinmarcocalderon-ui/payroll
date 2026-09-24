<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Mail\AdminOtpMail;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const OTP_ROLES = [User::ROLE_ADMIN, User::ROLE_HR_STAFF];
    private const OTP_EXPIRES_MINUTES = 5;
    private const OTP_MAX_ATTEMPTS = 5;

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'employee_number' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $user = $this->findUserByLoginId($credentials['employee_number']);

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'employee_number' => ['These credentials do not match our records.'],
            ]);
        }

       if (! config('app.otp_enabled') || ! in_array($user->role, self::OTP_ROLES, true)) {
            $token = $user->createToken('pbms-frontend')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user' => new UserResource($user),
            ]);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->forceFill([
            'otp_code' => bcrypt($code),
            'otp_expires_at' => now()->addMinutes(self::OTP_EXPIRES_MINUTES),
        ])->save();

        Mail::to($user->email)->send(new AdminOtpMail($code, self::OTP_EXPIRES_MINUTES));

        // A fresh code resets the attempt counter for this login ID.
        RateLimiter::clear($this->otpThrottleKey($credentials['employee_number'], $request));

        return response()->json([
            'otp_required' => true,
            'email_hint' => $this->maskEmail($user->email),
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'employee_number' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string'],
        ]);

        $key = $this->otpThrottleKey($data['employee_number'], $request);

        if (RateLimiter::tooManyAttempts($key, self::OTP_MAX_ATTEMPTS)) {
            throw ValidationException::withMessages([
                'code' => ['Too many attempts. Please request a new code later.'],
            ]);
        }

        $user = $this->findUserByLoginId($data['employee_number']);

        if (
            ! $user ||
            ! $user->otp_code ||
            ! $user->otp_expires_at ||
            now()->greaterThan($user->otp_expires_at) ||
            ! Hash::check($data['code'], $user->otp_code)
        ) {
            RateLimiter::hit($key, self::OTP_EXPIRES_MINUTES * 60);

            throw ValidationException::withMessages([
                'code' => ['This code is invalid or has expired.'],
            ]);
        }

        RateLimiter::clear($key);

        $user->forceFill([
            'otp_code' => null,
            'otp_expires_at' => null,
        ])->save();

        $token = $user->createToken('pbms-frontend')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    public function me(Request $request)
    {
        return new UserResource($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    /**
     * Resolve a login ID to a user.
     *
     * Employees and the employees table live on a separate DB connection,
     * so this uses two plain queries instead of a join.
     * Accounts with no linked employee record (e.g. a system admin) can
     * still sign in by typing their account email in the same field.
     */
    private function findUserByLoginId(string $loginId): ?User
    {
        // PostgreSQL string comparison is case-sensitive, so compare lowercased.
        $loginId = mb_strtolower(trim($loginId));

        $employee = Employee::whereRaw('LOWER(employee_number) = ?', [$loginId])->first();

        if ($employee) {
            return User::where('employee_id', $employee->id)->first();
        }

        return User::whereRaw('LOWER(email) = ?', [$loginId])->first();
    }

    private function otpThrottleKey(string $loginId, Request $request): string
    {
        return 'otp:' . strtolower(trim($loginId)) . '|' . $request->ip();
    }

    private function maskEmail(string $email): string
    {
        if (! str_contains($email, '@')) {
            return '***';
        }

        [$name, $domain] = explode('@', $email, 2);

        return substr($name, 0, 1) . str_repeat('*', max(strlen($name) - 1, 2)) . '@' . $domain;
    }
}