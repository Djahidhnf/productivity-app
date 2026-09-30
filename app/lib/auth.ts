import 'server-only';
import bcrypt from 'bcryptjs';
import { configuredAccounts, type AccountId } from '@/app/lib/accounts';

/** Returns the id of the account these credentials belong to, or null. */
export async function verifyCredentials(email: string, password: string): Promise<AccountId | null> {
  const normalized = email.trim().toLowerCase();
  const account = configuredAccounts().find((a) => a.email.trim().toLowerCase() === normalized);
  if (!account) return null;
  return (await bcrypt.compare(password, account.passwordHash)) ? account.id : null;
}
