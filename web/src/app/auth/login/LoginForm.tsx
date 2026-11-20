'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

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
    <form onSubmit={submit} className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</p>}

      <div>
        <label htmlFor="login-email" className="mb-1 block text-xs font-medium text-stone-600">Email</label>
        <input
          id="login-email"
          className="input !h-11 !rounded-md !px-3 !py-0 !text-base"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-1 block text-xs font-medium text-stone-600">Password</label>
        <input
          id="login-password"
          className="input !h-11 !rounded-md !px-3 !py-0 !text-base"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>

      <button
        className="btn-primary w-full !h-11 !min-h-0 !rounded-md !bg-[#9E0000] !px-3 !py-0 text-sm font-bold hover:!bg-[#8B0000] disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
