'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { AccountAuthProvider } from '@/components/account/account-auth-provider';
import { CartProvider } from '@/context/cart-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <AccountAuthProvider>{children}</AccountAuthProvider>
      </CartProvider>
    </SessionProvider>
  );
}
