import 'server-only';
import bcrypt from 'bcryptjs';

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = process.env.AUTH_EMAIL;
  const expectedHash = process.env.AUTH_PASSWORD_HASH;
  if (!expectedEmail || !expectedHash) return false;
  if (email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) return false;
  return bcrypt.compare(password, expectedHash);
}
