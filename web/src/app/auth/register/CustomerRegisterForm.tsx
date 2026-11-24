'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogoLoadingOverlay } from '@/components/LogoLoading';

type FieldState = 'empty' | 'valid' | 'invalid';

function mark(v: string, ok: boolean): FieldState {
  return v.trim() === '' ? 'empty' : ok ? 'valid' : 'invalid';
}

const RING: Record<FieldState, string> = {
  empty: '',
  valid: 'border-ochre-500 focus:border-ochre-500 focus:ring-ochre-500',
  invalid: 'border-crimson-400 focus:border-crimson-500 focus:ring-crimson-500',
};

const HINT: Record<FieldState, string> = {
  empty: 'text-stone-500',
  valid: 'text-ochre-800 font-semibold',
  invalid: 'text-crimson-600 font-medium',
};

export default function CustomerRegisterForm() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    terms: false,
  });

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  function set<K extends keyof typeof form>(
    k: K,
    v: (typeof form)[K]
  ) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Live validation
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const phoneOk = /^09\d{9}$/.test(form.phone.trim());
  const passOk = form.password.length >= 8;

  const matchOk =
    form.password_confirmation !== '' &&
    form.password_confirmation === form.password;

  const formValid = Boolean(
    form.first_name.trim() &&
    form.last_name.trim() &&
    emailOk &&
    phoneOk &&
    passOk &&
    matchOk &&
    form.terms
  );

  const emailState = mark(form.email, emailOk);
  const phoneState = mark(form.phone.trim(), phoneOk);
  const passState = mark(form.password, passOk);
  const matchState = mark(form.password_confirmation, matchOk);

  // Submit registration details
  async function submitDetails(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formValid) {
      setError('Please fix the highlighted fields before continuing.');
      return;
    }

    setBusy(true);
    setLoadingMessage('Creating your account…');
    setError('');

    try {
      const res = await fetch('/api/auth/register-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.status === 'success') {
        setStep(2);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setBusy(false);
      setLoadingMessage('');
    }
  }

  // Verify OTP
  async function verifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setBusy(true);
    setLoadingMessage('Verifying your account…');
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        router.push(data.redirect);
        router.refresh();
      } else {
        setError(data.message || 'Verification failed.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setBusy(false);
      setLoadingMessage('');
    }
  }

  // Resend OTP
  async function resend() {
    setInfo('');
    setError('');
    setBusy(true);
    setLoadingMessage('Sending a new verification code…');

    try {
      const res = await fetch('/api/auth/register-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, resend: true }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        setInfo(data.message || 'A new verification code has been sent.');
      } else {
        setError(data.message || 'Could not resend the code.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setBusy(false);
      setLoadingMessage('');
    }
  }

  // STEP 2: OTP Verification
  if (step === 2) {
    return (
      <form
        onSubmit={verifyOtp}
        className="mx-auto mt-4 w-full min-w-0 space-y-3"
        aria-busy={busy}
      >
        {busy && <LogoLoadingOverlay message={loadingMessage} />}
        <p className="break-words rounded-lg border border-ochre-200 bg-ochre-50 px-2 py-2 text-[8px] font-medium text-charcoal-900">
          We emailed a 6-digit code to <b>{form.email}</b>. It may take a minute to arrive.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-2 py-2 text-[8px] text-red-700">
            {error}
          </p>
        )}

        {info && (
          <p className="rounded-lg border border-ochre-200 bg-ochre-50 px-2 py-2 text-[8px] font-medium text-ochre-900">
            {info}
          </p>
        )}

        <div className="min-w-0">
          <label className="mb-0.5 block text-[7px] font-medium text-stone-700">
            6-digit code
          </label>

          <input
            className="input !h-[22px] !min-h-0 w-full min-w-0 !rounded-[4px] !px-2 !py-0 text-center !text-[9px] tracking-[0.4em]"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="••••••"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
          />

          <p className="mt-0.5 text-[6px] text-stone-500">
            The code expires in 10 minutes.
          </p>
        </div>

        <button
          className="btn-primary !h-[20px] !min-h-0 w-full !rounded-[4px] !py-0 !text-[8px]"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Verifying…' : 'Verify & create account'}
        </button>

        <button
          type="button"
          className="btn-outline !h-[20px] !min-h-0 w-full !rounded-[4px] !py-0 !text-[8px]"
          onClick={resend}
          disabled={busy}
        >
          Resend code
        </button>
      </form>
    );
  }

  // STEP 1: Registration Form
  return (
    <form
      onSubmit={submitDetails}
      className="mx-auto mt-4 w-full min-w-0 space-y-3"
      noValidate
      aria-busy={busy}
    >
      {busy && <LogoLoadingOverlay message={loadingMessage} />}
      {error && (
        <p className="rounded-lg bg-red-50 px-2 py-2 text-[8px] text-red-700">
          {error}
        </p>
      )}

      {/* First and Last Name */}
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <div className="min-w-0">
          <label className="mb-0.5 block text-[7px] font-medium text-stone-700">
            First name
          </label>

          <input
            className="input !h-[18px] !min-h-0 w-full min-w-0 !rounded-[4px] !px-1.5 !py-0 !text-[8px]"
            value={form.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            autoComplete="given-name"
            required
          />
        </div>

        <div className="min-w-0">
          <label className="mb-0.5 block text-[7px] font-medium text-stone-700">
            Last name
          </label>

          <input
            className="input !h-[18px] !min-h-0 w-full min-w-0 !rounded-[4px] !px-1.5 !py-0 !text-[8px]"
            value={form.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="min-w-0">
        <label className="mb-0.5 block text-[7px] font-medium text-stone-700">
          Email
        </label>

        <input
          className={`input !h-[18px] !min-h-0 w-full min-w-0 !rounded-[4px] !px-1.5 !py-0 !text-[8px] ${RING[emailState]}`}
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          autoComplete="email"
          required
        />

        {emailState !== 'empty' && (
          <p className={`mt-0.5 text-[6px] leading-tight ${HINT[emailState]}`}>
            {emailOk
              ? 'Looks good ✓'
              : 'Please use a full address, e.g. you@example.com'}
          </p>
        )}
      </div>

      {/* Mobile Number */}
      <div className="min-w-0">
        <label className="mb-0.5 block text-[7px] font-medium text-stone-700">
          Mobile number
        </label>

        <input
          className={`input !h-[18px] !min-h-0 w-full min-w-0 !rounded-[4px] !px-1.5 !py-0 !text-[8px] ${RING[phoneState]}`}
          type="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          inputMode="numeric"
          autoComplete="tel"
          maxLength={11}
          required
        />

        <p className={`mt-0.5 text-[6px] leading-tight ${HINT[phoneState]}`}>
          {phoneOk
            ? 'Looks good ✓'
            : '11 digits starting with 09 — we use this for delivery coordination'}
        </p>
      </div>

      {/* Password and Confirmation */}
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <div className="min-w-0">
          <label className="mb-0.5 block text-[7px] font-medium text-stone-700">
            Password
          </label>

          <input
            className={`input !h-[18px] !min-h-0 w-full min-w-0 !rounded-[4px] !px-1.5 !py-0 !text-[8px] ${RING[passState]}`}
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            autoComplete="new-password"
            required
          />

          <p className={`mt-0.5 text-[6px] leading-tight ${HINT[passState]}`}>
            {passOk ? 'Looks good ✓' : 'Must be 8+ characters'}
          </p>
        </div>

        <div className="min-w-0">
          <label className="mb-0.5 block text-[7px] font-medium text-stone-700">
            Confirm password
          </label>

          <input
            className={`input !h-[18px] !min-h-0 w-full min-w-0 !rounded-[4px] !px-1.5 !py-0 !text-[8px] ${RING[matchState]}`}
            type="password"
            value={form.password_confirmation}
            onChange={(e) =>
              set('password_confirmation', e.target.value)
            }
            autoComplete="new-password"
            required
          />

          <p className={`mt-0.5 text-[6px] leading-tight ${HINT[matchState]}`}>
            {matchOk
              ? 'Passwords match ✓'
              : form.password_confirmation
                ? "Passwords don't match yet"
                : 'Re-enter your password'}
          </p>
        </div>
      </div>

      {/* Terms and Conditions */}
      <label className="flex min-w-0 items-start gap-1.5 text-[7px] leading-tight text-stone-600">
        <input
          type="checkbox"
          className="mt-0.5 h-2.5 w-2.5 shrink-0 accent-[#8B0000]"
          checked={form.terms}
          onChange={(e) => set('terms', e.target.checked)}
          required
        />

        <span className="min-w-0">
          I agree to the Terms &amp; Conditions and Privacy Policy
        </span>
      </label>

      {/* Submit */}
      <button
        className="btn-primary !h-[18px] !min-h-0 w-full !rounded-[4px] !py-0 !text-[7px] font-bold"
        disabled={busy}
        type="submit"
      >
        {busy ? 'Creating your account…' : 'Continue'}
      </button>

    </form>
  );
}
