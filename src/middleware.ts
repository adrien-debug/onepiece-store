import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-check';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        if (path === '/admin/login' || path.startsWith('/admin/login/')) return true;
        return Boolean(token?.email && isAdmin(token.email as string));
      },
    },
    pages: { signIn: '/admin/login' },
  },
);

export const config = {
  matcher: ['/admin/:path*'],
};
