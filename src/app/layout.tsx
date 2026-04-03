import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { ShopShell } from '@/components/shop-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'ONE PIECE SHOP — Boutique officielle',
  description: 'Boutique One Piece — Figurines, goodies, mugs, t-shirts et plus encore.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="fr" suppressHydrationWarning className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh bg-[var(--op-cream)] text-[var(--op-ink)] font-[family-name:var(--font-sans)]">
        <Providers>
          <ShopShell>{children}</ShopShell>
        </Providers>
      </body>
    </html>
  );
}
