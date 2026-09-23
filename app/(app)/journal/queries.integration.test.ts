/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll } from 'vitest';

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

import { vi } from 'vitest';
import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { getJournalEntries } from './queries';

describe('getJournalEntries', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.journalEntry.deleteMany({ where: { date: { in: [new Date('2026-01-15'), new Date('2026-01-20')] } } });
  });

  test('returns entries ordered by date descending, serialized to date-key strings', async () => {
    await prisma.journalEntry.create({ data: { date: new Date('2026-01-15'), text: 'Earlier', mood: 'OKAY' } });
    await prisma.journalEntry.create({ data: { date: new Date('2026-01-20'), text: 'Later', mood: 'GOOD' } });

    const result = await getJournalEntries();
    const testEntries = result.filter((e) => e.date === '2026-01-15' || e.date === '2026-01-20');
    expect(testEntries).toEqual([
      { date: '2026-01-20', text: 'Later', mood: 'GOOD' },
      { date: '2026-01-15', text: 'Earlier', mood: 'OKAY' },
    ]);
  });
});
