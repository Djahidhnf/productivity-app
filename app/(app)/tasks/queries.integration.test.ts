/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll, vi } from 'vitest';

// getTaskLists() calls verifySession(), which calls next/headers' cookies().
// Outside an actual Next.js request (i.e. under plain vitest), cookies()
// throws "called outside a request scope". Mock next/headers/next/navigation
// the same way app/lib/dal.test.ts (and actions.integration.test.ts) does,
// and seed a valid session cookie so verifySession() resolves normally and
// this test exercises the real DB logic instead of the auth redirect.
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
import { getTaskLists } from './queries';

describe('getTaskLists', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'QueryTest ' } } });
    await prisma.taskList.deleteMany({ where: { name: { startsWith: 'QueryTest ' } } });
  });

  test('returns lists ordered by order, each with its tasks ordered by order, due serialized as a date string', async () => {
    const listB = await prisma.taskList.create({ data: { name: 'QueryTest B', order: 1 } });
    const listA = await prisma.taskList.create({ data: { name: 'QueryTest A', order: 0 } });

    await prisma.task.create({ data: { text: 'QueryTest second', listId: listA.id, order: 1 } });
    await prisma.task.create({
      data: { text: 'QueryTest first', listId: listA.id, order: 0, due: new Date('2026-03-01'), priority: 'RED' },
    });

    const result = await getTaskLists();
    const a = result.find((l) => l.id === listA.id)!;
    const b = result.find((l) => l.id === listB.id)!;

    expect(result.indexOf(a)).toBeLessThan(result.indexOf(b));
    expect(a.tasks.map((t) => t.text)).toEqual(['QueryTest first', 'QueryTest second']);
    expect(a.tasks[0].due).toBe('2026-03-01');
    expect(a.tasks[0].priority).toBe('RED');
    expect(a.tasks[1].due).toBeNull();
  });
});
