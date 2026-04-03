import { Suspense } from 'react';
import { AdminLoginClient } from './admin-login-client';

export default function AdminLoginPage() {
  const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[color:var(--dashboard-text-muted)]">
          Chargement…
        </div>
      }
    >
      <AdminLoginClient hasGoogle={hasGoogle} />
    </Suspense>
  );
}
