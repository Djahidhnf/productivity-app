/**
 * @vitest-environment node
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';

const cookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { getSession, verifySession } from '@/app/lib/dal';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';

beforeEach(() => {
  cookieStore.clear();
});

describe('getSession', () => {
  test('returns null when there is no session cookie', async () => {
    await expect(getSession()).resolves.toBeNull();
  });

  test('returns the session payload for a valid cookie', async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
    const session = await getSession();
    expect(session?.sub).toBe('owner');
  });
});

describe('verifySession', () => {
  test('redirects to /login when there is no session', async () => {
    await expect(verifySession()).rejects.toThrow('REDIRECT:/login');
  });

  test('returns the session when valid', async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
    const session = await verifySession();
    expect(session.sub).toBe('owner');
  });
});
