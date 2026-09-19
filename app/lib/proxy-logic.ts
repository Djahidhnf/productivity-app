const PUBLIC_PATHS = new Set(['/login']);

/**
 * Returns the path to redirect to, or null to let the request through.
 * `/` is intentionally left out of PUBLIC_PATHS: it does its own
 * session-based redirect in app/page.tsx, so Proxy should leave it alone.
 */
export function resolveProxyRedirect(pathname: string, hasSession: boolean): string | null {
  if (pathname === '/') return null;

  const isPublic = PUBLIC_PATHS.has(pathname);
  if (!isPublic && !hasSession) return '/login';
  if (isPublic && hasSession) return '/dashboard';
  return null;
}
