'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function AdminLoginClient({ hasGoogle }: { hasGoogle: boolean }) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin';
  const error = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn('credentials', { email, password, callbackUrl, redirect: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--dashboard-text-bright)]">
          Connexion administrateur
        </h1>
        <p className="mt-2 text-sm text-[color:var(--dashboard-text-secondary)]">
          Comptes listés dans <code className="text-[color:var(--dashboard-accent)]">ADMIN_EMAILS</code>.
        </p>
      </div>

      {error ? (
        <p className="rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-error-border)] bg-[color:var(--dashboard-error-bg)] px-3 py-2 text-sm text-[color:var(--dashboard-error)]">
          Connexion refusée ou session invalide.
        </p>
      ) : null}

      {hasGoogle ? (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-card)] px-4 py-3 text-sm font-medium text-[color:var(--dashboard-text-primary)] transition hover:bg-[color:var(--dashboard-overlay-05)]"
          onClick={() => signIn('google', { callbackUrl })}
        >
          Continuer avec Google
        </button>
      ) : null}

      <form onSubmit={onCredentials} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[color:var(--dashboard-text-secondary)]">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-surface)] px-3 py-2 text-[color:var(--dashboard-text-primary)] outline-none ring-[color:var(--dashboard-accent-ring)] focus:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[color:var(--dashboard-text-secondary)]">Mot de passe</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="rounded-[var(--dashboard-radius-input)] border border-[color:var(--dashboard-border-mid)] bg-[color:var(--dashboard-surface)] px-3 py-2 text-[color:var(--dashboard-text-primary)] outline-none ring-[color:var(--dashboard-accent-ring)] focus:ring-2"
          />
        </label>
        <p className="text-xs text-[color:var(--dashboard-text-muted)]">
          Mot de passe : <code className="text-[color:var(--dashboard-accent)]">ONEPEACE_SHOP_PASSWORD</code> (serveur).
        </p>
        <button
          type="submit"
          disabled={busy}
          className="rounded-[var(--dashboard-radius-button)] bg-[color:var(--dashboard-accent)] px-4 py-2.5 text-sm font-medium text-[color:var(--dashboard-page)] disabled:opacity-50"
        >
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <Link
        href="/"
        className="text-center text-sm text-[color:var(--dashboard-text-muted)] hover:text-[color:var(--dashboard-text-secondary)]"
      >
        Retour boutique
      </Link>
    </main>
  );
}
