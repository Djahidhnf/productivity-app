/**
 * The app has two fixed accounts, configured through env vars. Every row of
 * user data carries the owning account's id in `userId`. 'owner' is the
 * original single account, so data and sessions from before accounts
 * existed keep belonging to it.
 */
export const ACCOUNT_IDS = ['owner', 'second'] as const;
export type AccountId = (typeof ACCOUNT_IDS)[number];

export function isAccountId(value: unknown): value is AccountId {
  return typeof value === 'string' && (ACCOUNT_IDS as readonly string[]).includes(value);
}

export interface AccountCredentials {
  id: AccountId;
  email: string;
  passwordHash: string;
}

/** Accounts whose email and password hash are both set. */
export function configuredAccounts(env: NodeJS.ProcessEnv = process.env): AccountCredentials[] {
  const candidates: { id: AccountId; email?: string; passwordHash?: string }[] = [
    { id: 'owner', email: env.AUTH_EMAIL, passwordHash: env.AUTH_PASSWORD_HASH },
    { id: 'second', email: env.AUTH_EMAIL_2, passwordHash: env.AUTH_PASSWORD_HASH_2 },
  ];
  return candidates.filter((a): a is AccountCredentials => !!a.email?.trim() && !!a.passwordHash);
}
