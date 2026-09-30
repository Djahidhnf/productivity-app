import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { resolveProxyRedirect } from '@/app/lib/proxy-logic';
import { decryptSession } from '@/app/lib/session';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(token);
  const hasSession = session !== null;
  const target = resolveProxyRedirect(request.nextUrl.pathname, hasSession);

  if (target) {
    return NextResponse.redirect(new URL(target, request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|sw\\.js$|manifest\\.webmanifest$|.*\\.(?:png|svg|ico)$).*)'],
};
