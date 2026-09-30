/**
 * @vitest-environment node
 */
import { describe, test, expect, afterAll, beforeAll, vi } from 'vitest';

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
import { getDashboardTasks, getRecentNotes } from './queries';

describe('dashboard queries', () => {
  let listId: string;
  const noteIds: string[] = [];

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
    const list = await prisma.taskList.create({ data: { userId: 'owner', name: 'DashboardQueryTest', order: 999 } });
    listId = list.id;
  });

  afterAll(async () => {
    await prisma.taskList.delete({ where: { id: listId } });
    await prisma.note.deleteMany({ where: { id: { in: noteIds } } });
  });

  test('getDashboardTasks returns open tasks plus done ones dated within a day of today', async () => {
    const make = (text: string, done: boolean, due: string | null) =>
      prisma.task.create({ data: { userId: 'owner', text, listId, order: 0, done, due: due ? new Date(due) : null } });
    await make('DQ open undated', false, null);
    await make('DQ done yesterday', true, '2026-09-25');
    await make('DQ done tomorrow', true, '2026-09-27');
    await make('DQ done last week', true, '2026-09-19');

    const texts = (await getDashboardTasks('2026-09-26')).filter((t) => t.listId === listId).map((t) => t.text);
    expect(texts.sort()).toEqual(['DQ done tomorrow', 'DQ done yesterday', 'DQ open undated']);
  });

  test('getRecentNotes returns the most recently edited notes first, up to the limit', async () => {
    for (const [text, updatedAt] of [
      ['DQ note old', '2099-01-01T00:00:00Z'],
      ['DQ note new', '2099-01-03T00:00:00Z'],
      ['DQ note mid', '2099-01-02T00:00:00Z'],
    ] as const) {
      const note = await prisma.note.create({ data: { userId: 'owner', text, updatedAt: new Date(updatedAt) } });
      noteIds.push(note.id);
    }
    expect((await getRecentNotes(2)).map((n) => n.text)).toEqual(['DQ note new', 'DQ note mid']);
  });
});
