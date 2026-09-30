import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decryptSession, type SessionPayload } from '@/app/lib/session';
import type { AccountId } from '@/app/lib/accounts';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return decryptSession(token);
}

export async function verifySession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/** The signed-in account's id; redirects to /login without a session. Scope every data query by it. */
export async function requireUserId(): Promise<AccountId> {
  return (await verifySession()).sub;
}
