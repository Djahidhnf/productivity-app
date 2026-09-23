/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, afterAll, beforeAll, vi } from 'vitest';

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
import { getCalendarTasks } from './queries';

describe('getCalendarTasks', () => {
  let listId: string;

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
    const list = await prisma.taskList.create({ data: { name: 'CalendarTest List', order: 0 } });
    listId = list.id;
  });

  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'CalendarTest ' } } });
  });

  afterAll(async () => {
    await prisma.taskList.delete({ where: { id: listId } });
  });

  test('excludes tasks with no due date', async () => {
    await prisma.task.create({ data: { text: 'CalendarTest no due', listId, order: 0 } });
    await prisma.task.create({ data: { text: 'CalendarTest has due', listId, order: 1, due: new Date('2026-10-05') } });
    const result = await getCalendarTasks();
    const texts = result.map((t) => t.text);
    expect(texts).toContain('CalendarTest has due');
    expect(texts).not.toContain('CalendarTest no due');
  });

  test('includes done tasks (unlike Matrix)', async () => {
    await prisma.task.create({ data: { text: 'CalendarTest done', listId, order: 2, due: new Date('2026-10-06'), done: true } });
    const result = await getCalendarTasks();
    const found = result.find((t) => t.text === 'CalendarTest done');
    expect(found).toBeDefined();
    expect(found?.done).toBe(true);
  });

  test('orders by due date then dueTime', async () => {
    await prisma.task.create({ data: { text: 'CalendarTest later time', listId, order: 3, due: new Date('2026-10-07'), dueTime: 600 } });
    await prisma.task.create({ data: { text: 'CalendarTest earlier time', listId, order: 4, due: new Date('2026-10-07'), dueTime: 120 } });
    const result = await getCalendarTasks();
    const sameDay = result.filter((t) => t.due === '2026-10-07');
    expect(sameDay.map((t) => t.text)).toEqual(['CalendarTest earlier time', 'CalendarTest later time']);
  });
});
