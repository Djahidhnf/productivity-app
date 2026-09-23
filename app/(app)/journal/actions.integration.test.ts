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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { revalidatePath } from 'next/cache';
import { saveJournalEntry } from './actions';

describe('saveJournalEntry', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.journalEntry.deleteMany({ where: { date: new Date('2026-02-10') } });
    vi.mocked(revalidatePath).mockClear();
  });

  test('creates a new entry when none exists for that date', async () => {
    const entry = await saveJournalEntry({ date: '2026-02-10', text: 'First entry', mood: 'GREAT' });
    expect(entry).toEqual({ date: '2026-02-10', text: 'First entry', mood: 'GREAT' });
    const rows = await prisma.journalEntry.findMany({ where: { date: new Date('2026-02-10') } });
    expect(rows).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith('/journal', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('updates the existing entry for that date instead of creating a duplicate', async () => {
    await saveJournalEntry({ date: '2026-02-10', text: 'First entry', mood: 'GREAT' });
    vi.mocked(revalidatePath).mockClear();

    const updated = await saveJournalEntry({ date: '2026-02-10', text: 'Edited entry', mood: 'LOW' });
    expect(updated).toEqual({ date: '2026-02-10', text: 'Edited entry', mood: 'LOW' });

    const rows = await prisma.journalEntry.findMany({ where: { date: new Date('2026-02-10') } });
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe('Edited entry');
    expect(rows[0].mood).toBe('LOW');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
