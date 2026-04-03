import type { ReactNode } from 'react';

/** Root layout for `/admin/*` — shell (sidebar) lives under `(panel)/layout.tsx`; `/admin/login` stays unwrapped. */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
