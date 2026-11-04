'use client';

import { useState } from 'react';

/** Password-only login for the hosted studio; on success it returns to the page that was asked for. */
export default function PasswordLogin({ next }: { next?: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.assign(target);
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(body.error || 'Could not sign in');
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card rounded-2xl p-6">
      <label htmlFor="studio-password" className="text-sm font-semibold">
        Studio password
      </label>
      <div className="mt-3 flex gap-2">
        <input
          id="studio-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-ink-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-gold)]"
        />
        <button type="submit" disabled={busy || !password} className="btn btn-gold">
          {busy ? 'Opening…' : 'Open studio'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--color-sindoor)]">{error}</p>}
    </form>
  );
}
