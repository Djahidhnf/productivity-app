import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { resolveProxyRedirect } from '@/app/lib/proxy-logic';

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const target = resolveProxyRedirect(request.nextUrl.pathname, hasSession);

  if (target) {
    return NextResponse.redirect(new URL(target, request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico)$).*)'],
};
