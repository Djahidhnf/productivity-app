import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decryptSession, type SessionPayload } from '@/app/lib/session';
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
