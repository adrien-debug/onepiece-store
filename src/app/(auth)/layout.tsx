import type { ReactNode } from 'react';

/** Auth segment: pages supply `AuthLayout` + forms; shared metadata via child pages. */
export default function AuthSegmentLayout({ children }: { children: ReactNode }) {
  return children;
}
