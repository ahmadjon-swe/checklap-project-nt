import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fast, optimistic pre-render guard. Tokens live in localStorage (unreadable
// here), so we rely on the non-sensitive `cl_auth` presence cookie set at login.
// This only redirects anonymous users away from protected shells before the HTML
// is sent — real authorization (and role checks) are enforced by the backend JWT
// guards and the client-side RouteGuard. Treat the cookie as spoofable/optimistic.
export function proxy(request: NextRequest) {
  const isLoggedIn = request.cookies.get('cl_auth')?.value === '1';
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*'],
};
