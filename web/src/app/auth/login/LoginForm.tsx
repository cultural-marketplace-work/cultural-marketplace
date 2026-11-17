'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!terms) {
      setError('Please agree to the Terms & Conditions and Privacy Policy to continue.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        router.push(data.redirect);
        router.refresh();
      } else {
        setError(data.message || 'Login failed.');
        setBusy(false);
      }
    } catch {
      setError('Unable to connect. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}

      <div>
        <label htmlFor="login-email" className="mb-0.5 block text-[9px] font-medium text-stone-600">Email</label>
        <input
          id="login-email"
          className="input !h-[21px] !rounded-md !px-2 !py-0 !text-[9px]"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-0.5 block text-[9px] font-medium text-stone-600">Password</label>
        <input
          id="login-password"
          className="input !h-[21px] !rounded-md !px-2 !py-0 !text-[9px]"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <div>
        <label className="flex min-w-0 items-center gap-1.5 text-[8px] leading-relaxed text-stone-600">
          <input
            type="checkbox"
            className="h-3 w-3 shrink-0 accent-[#8B0000]"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            required
          />

          <span className="min-w-0">
            I agree to the Terms &amp; Conditions and Privacy Policy
          </span>
        </label>
      </div>

      <button
        className="btn-primary w-full !h-[21px] !min-h-0 !rounded-md !bg-[#9E0000] !px-3 !py-0 !text-[9px] font-bold hover:!bg-[#8B0000] disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
