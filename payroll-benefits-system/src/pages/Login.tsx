import { useEffect, useState } from 'react';
import { LockKeyhole, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authService, isOtpChallenge } from '../services/auth.service';
import { ApiError } from '../services/apiClient';
import logo from '../assets/archon-nell-logo.png';

type Step = 'credentials' | 'otp';

const RESEND_SECONDS = 60;

export function Login() {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>('credentials');
  const [code, setCode] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [expiresIn, setExpiresIn] = useState(10);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function completeLogin(token: string) {
    authService.saveToken(token);
    window.location.href = '/';
  }

  function errorMessage(err: unknown, invalidMessage: string) {
    if (err instanceof ApiError) {
      if (err.status === 422) return invalidMessage;
      if (err.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    }
    return 'Could not reach the server. Check your connection and try again.';
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.login(employeeNumber.trim(), password);

      if (isOtpChallenge(res)) {
        setEmailHint(res.email_hint);
        setExpiresIn(res.expires_in_minutes ?? 10);
        setCooldown(RESEND_SECONDS);
        setNotice(null);
        setCode('');
        setStep('otp');
        return;
      }

      await completeLogin(res.token);
    } catch (err) {
      setError(errorMessage(err, 'Incorrect employee ID or password.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.verifyOtp(employeeNumber.trim(), code.trim());
      await completeLogin(res.token);
    } catch (err) {
      setError(
        errorMessage(
          err,
          'This code is invalid, expired, or has had too many attempts. Go back and sign in again for a new code.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      // Signing in again re-checks the password and emails a fresh code.
      const res = await authService.login(employeeNumber.trim(), password);

      if (isOtpChallenge(res)) {
        setEmailHint(res.email_hint);
        setExpiresIn(res.expires_in_minutes ?? 10);
        setCode('');
        setCooldown(RESEND_SECONDS);
        setNotice('A new code was sent. Older codes no longer work.');
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not resend the code. Go back and sign in again.'));
    } finally {
      setSubmitting(false);
    }
  }

  function backToCredentials() {
    setStep('credentials');
    setCode('');
    setError(null);
    setNotice(null);
    setCooldown(0);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden w-1/2 flex-col justify-between bg-navy-900 px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-white">
            <img src={logo} alt="Archon Nell Incorporated" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold">Archon Nell Incorporated</p>
            <p className="text-xs text-navy-100/60">Payroll &amp; Benefits Management</p>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Manage payroll and
            <br />
            benefits, all in one place.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-navy-100/70">
            Compute payroll, track claims and reimbursements, administer HMO benefits, and keep
            employee records — for your whole team, in a single system.
          </p>
        </div>

        <p className="text-xs text-navy-100/40">
          © {new Date().getFullYear()} Archon Nell Incorporated. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center bg-sand-50 px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              <img src={logo} alt="Archon Nell Incorporated" className="h-12 w-12 object-contain" />
            </div>
            <p className="text-sm font-bold text-ink-900">Archon Nell Incorporated</p>
          </div>

          {step === 'credentials' ? (
            <>
              <h1 className="text-2xl font-bold text-ink-900">Welcome back</h1>
              <p className="mt-1 text-sm text-ink-500">Sign in to your account to continue</p>

              <form onSubmit={handleCredentials} className="mt-6 space-y-4">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-ink-900">
                    Employee ID <span className="text-clay-600">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    placeholder="Enter your employee ID"
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 flex items-center justify-between font-medium text-ink-900">
                    Password <span className="text-clay-600">*</span>
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 pr-10 text-sm text-ink-900 outline-none transition focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                {error && (
                  <p className="rounded-lg bg-bad-100 px-3 py-2 text-sm text-bad-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  <LockKeyhole size={16} />
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-ink-300">
                No account yet? Ask your administrator to create one via the backend.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-ink-900">Check your email</h1>
              <p className="mt-1 text-sm text-ink-500">
                We sent a 6-digit code to <span className="font-medium">{emailHint}</span>. It
                expires in {expiresIn} minutes.
              </p>

              <form onSubmit={handleOtp} className="mt-6 space-y-4">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium text-ink-900">
                    Verification code <span className="text-clay-600">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-lg tracking-[0.5em] text-ink-900 outline-none transition focus:border-teal-500"
                  />
                </label>

                {error && (
                  <p className="rounded-lg bg-bad-100 px-3 py-2 text-sm text-bad-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || code.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  <ShieldCheck size={16} />
                  {submitting ? 'Verifying…' : 'Verify and sign in'}
                </button>

                {notice && !error && <p className="text-xs text-ink-500">{notice}</p>}

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={submitting || cooldown > 0}
                  className="w-full text-center text-xs font-medium text-teal-500 hover:opacity-80 disabled:text-ink-300"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>

                <button
                  type="button"
                  onClick={backToCredentials}
                  className="w-full text-center text-xs text-ink-500 hover:text-ink-900"
                >
                  Back to sign in
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}