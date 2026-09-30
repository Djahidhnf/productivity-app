/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, afterAll, beforeAll, vi } from 'vitest';

// getMatrixTasks() calls verifySession(), which calls next/headers' cookies().
// Outside an actual Next.js request (i.e. under plain vitest), cookies()
// throws "called outside a request scope". Mock next/headers/next/navigation
// the same way app/lib/dal.test.ts (and the Tasks phase's integration tests)
// do, and seed a valid session cookie so verifySession() resolves normally.
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
import { getMatrixTasks } from './queries';

describe('getMatrixTasks', () => {
  let listId: string;

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
    const list = await prisma.taskList.create({ data: { userId: 'owner', name: 'MatrixTest List', order: 0 } });
    listId = list.id;
  });

  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'MatrixTest ' } } });
  });

  afterAll(async () => {
    await prisma.taskList.delete({ where: { id: listId } });
  });

  test('excludes done tasks', async () => {
    await prisma.task.create({ data: { userId: 'owner', text: 'MatrixTest done', listId, order: 0, done: true } });
    await prisma.task.create({ data: { userId: 'owner', text: 'MatrixTest not done', listId, order: 1, done: false } });
    const result = await getMatrixTasks();
    const texts = result.map((t) => t.text);
    expect(texts).toContain('MatrixTest not done');
    expect(texts).not.toContain('MatrixTest done');
  });

  test('includes both flagged and unflagged non-done tasks with their real priority', async () => {
    await prisma.task.create({ data: { userId: 'owner', text: 'MatrixTest flagged', listId, order: 2, priority: 'RED' } });
    await prisma.task.create({ data: { userId: 'owner', text: 'MatrixTest unflagged', listId, order: 3 } });
    const result = await getMatrixTasks();
    const flagged = result.find((t) => t.text === 'MatrixTest flagged');
    const unflagged = result.find((t) => t.text === 'MatrixTest unflagged');
    expect(flagged?.priority).toBe('RED');
    expect(unflagged?.priority).toBeNull();
  });
});
