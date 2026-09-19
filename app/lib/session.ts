import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

export type SessionPayload = { sub: 'owner'; expiresAt: number };

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
    if (payload.sub !== 'owner' || typeof payload.exp !== 'number') return null;
    return { sub: 'owner', expiresAt: payload.exp * 1000 };
  } catch {
    return null;
  }
}
