/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll, vi } from 'vitest';

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

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { getFinanceEntries } from './queries';

// Far-future dates keep these rows away from real data.
const DATES = ['2091-02-28', '2091-03-01', '2091-05-15', '2091-08-31', '2091-09-01'];

describe('getFinanceEntries', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.financeEntry.deleteMany({ where: { date: { in: DATES.map((d) => new Date(d)) } } });
  });

  test('returns entries from the first day of fromMonth through the last day of toMonth, newest first', async () => {
    for (const date of DATES) {
      await prisma.financeEntry.create({ data: { userId: 'owner', type: 'EXPENSE', amount: 1000, category: 'Other', date: new Date(date) } });
    }
    const result = await getFinanceEntries('2091-03', '2091-08');
    expect(result.map((e) => e.date)).toEqual(['2091-08-31', '2091-05-15', '2091-03-01']);
    expect(result[0]).toMatchObject({ type: 'EXPENSE', amount: 1000, category: 'Other', note: '' });
  });
});
