import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { isAccountId, type AccountId } from '@/app/lib/accounts';

/** `sub` is the signed-in account's id (see app/lib/accounts.ts). */
export type SessionPayload = { sub: AccountId; expiresAt: number };

function encodedKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt / 1000))
    .sign(encodedKey());
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey(), { algorithms: ['HS256'] });
    if (!isAccountId(payload.sub) || typeof payload.exp !== 'number') return null;
    return { sub: payload.sub, expiresAt: payload.exp * 1000 };
  } catch {
    return null;
  }
}
