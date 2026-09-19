'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyCredentials } from '@/app/lib/auth';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const valid = await verifyCredentials(email, password);
  if (!valid) {
    return { error: 'Incorrect email or password.' };
  }

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = await encryptSession({ sub: 'owner', expiresAt });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/',
  });

  redirect('/dashboard');
}
