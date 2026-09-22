/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// These are Server Actions: every one of them calls verifySession(), which
// calls next/headers' cookies(). Outside an actual Next.js request (i.e.
// under plain vitest), cookies() throws "called outside a request scope".
// Mock next/headers/next/navigation the same way app/lib/dal.test.ts does,
// and seed a valid session cookie so verifySession() resolves normally and
// these tests exercise the real DB logic instead of the auth redirect.
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

// revalidatePath() also needs a Next.js request/render store that doesn't
// exist under plain vitest ("static generation store missing"). Every
// action calls it on success per the spec, so stub it out as a spy here
// rather than weakening the production code.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { revalidatePath } from 'next/cache';
import {
  createList,
  deleteList,
  reorderLists,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskDone,
  reorderTasks,
} from './actions';

describe('task/list server actions', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
  });

  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'ActionTest ' } } });
    await prisma.taskList.deleteMany({ where: { name: { startsWith: 'ActionTest ' } } });
  });

  test('createList creates a list at the next order position', async () => {
    const maxBefore = await prisma.taskList.aggregate({ _max: { order: true } });
    const list = await createList('ActionTest List');
    expect(list.name).toBe('ActionTest List');
    expect(list.order).toBe((maxBefore._max.order ?? -1) + 1);
  });

  test('createList assigns an order past the current max, even after a mid-sequence delete', async () => {
    const a = await createList('ActionTest OrderA');
    const b = await createList('ActionTest OrderB');
    await deleteList(a.id);
    const c = await createList('ActionTest OrderC');
    expect(c.order).toBeGreaterThan(b.order);
    await prisma.taskList.deleteMany({ where: { id: { in: [b.id, c.id] } } });
  });

  test('deleteList cascades to delete its tasks', async () => {
    const list = await createList('ActionTest Cascade');
    const task = await createTask({ text: 'ActionTest cascade task', listId: list.id });
    await deleteList(list.id);
    const found = await prisma.task.findUnique({ where: { id: task.id } });
    expect(found).toBeNull();
  });

  test('reorderLists sets each list order to its array index', async () => {
    const a = await createList('ActionTest Reorder A');
    const b = await createList('ActionTest Reorder B');
    await reorderLists([b.id, a.id]);
    const refreshedA = await prisma.taskList.findUniqueOrThrow({ where: { id: a.id } });
    const refreshedB = await prisma.taskList.findUniqueOrThrow({ where: { id: b.id } });
    expect(refreshedB.order).toBe(0);
    expect(refreshedA.order).toBe(1);
    await prisma.taskList.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  });

  test('createTask, updateTask, toggleTaskDone, deleteTask round-trip', async () => {
    const list = await createList('ActionTest CRUD');
    const created = await createTask({ text: 'ActionTest task', listId: list.id });
    expect(created.done).toBe(false);
    expect(created.priority).toBeNull();

    const updated = await updateTask({
      id: created.id,
      text: 'ActionTest task edited',
      listId: list.id,
      priority: 'AMBER',
      due: '2026-04-01',
      dueTime: 90,
    });
    expect(updated.text).toBe('ActionTest task edited');
    expect(updated.priority).toBe('AMBER');
    expect(updated.due).toBe('2026-04-01');
    expect(updated.dueTime).toBe(90);

    const toggled = await toggleTaskDone(created.id);
    expect(toggled.done).toBe(true);
    const toggledAgain = await toggleTaskDone(created.id);
    expect(toggledAgain.done).toBe(false);

    await deleteTask(created.id);
    const found = await prisma.task.findUnique({ where: { id: created.id } });
    expect(found).toBeNull();
    await prisma.taskList.delete({ where: { id: list.id } });
  });

  test('reorderTasks sets order and can move a task into a different list', async () => {
    const listA = await createList('ActionTest MoveA');
    const listB = await createList('ActionTest MoveB');
    const t1 = await createTask({ text: 'ActionTest t1', listId: listA.id });
    const t2 = await createTask({ text: 'ActionTest t2', listId: listA.id });

    await reorderTasks({ listId: listB.id, orderedTaskIds: [t2.id] });
    const movedT2 = await prisma.task.findUniqueOrThrow({ where: { id: t2.id } });
    expect(movedT2.listId).toBe(listB.id);
    expect(movedT2.order).toBe(0);

    await reorderTasks({ listId: listA.id, orderedTaskIds: [t1.id] });
    const remainingT1 = await prisma.task.findUniqueOrThrow({ where: { id: t1.id } });
    expect(remainingT1.order).toBe(0);

    await prisma.task.deleteMany({ where: { id: { in: [t1.id, t2.id] } } });
    await prisma.taskList.deleteMany({ where: { id: { in: [listA.id, listB.id] } } });
  });

  test('createTask assigns an order past the current max within a list, even after a mid-sequence delete', async () => {
    const list = await createList('ActionTest OrderTaskList');
    const t1 = await createTask({ text: 'ActionTest OrderTask1', listId: list.id });
    const t2 = await createTask({ text: 'ActionTest OrderTask2', listId: list.id });
    await deleteTask(t1.id);
    const t3 = await createTask({ text: 'ActionTest OrderTask3', listId: list.id });
    expect(t3.order).toBeGreaterThan(t2.order);
    await prisma.taskList.delete({ where: { id: list.id } });
  });

  test('deleteList, createTask, updateTask, deleteTask, and toggleTaskDone all revalidate /matrix in addition to /tasks', async () => {
    const list = await createList('ActionTest RevalidateList');
    expect(revalidatePath).toHaveBeenCalledWith('/tasks');
    expect(revalidatePath).not.toHaveBeenCalledWith('/matrix');

    vi.mocked(revalidatePath).mockClear();
    const task = await createTask({ text: 'ActionTest revalidate task', listId: list.id });
    expect(revalidatePath).toHaveBeenCalledWith('/matrix');

    vi.mocked(revalidatePath).mockClear();
    await updateTask({ id: task.id, text: 'ActionTest revalidate task edited', listId: list.id, priority: null, due: null, dueTime: null });
    expect(revalidatePath).toHaveBeenCalledWith('/matrix');

    vi.mocked(revalidatePath).mockClear();
    await toggleTaskDone(task.id);
    expect(revalidatePath).toHaveBeenCalledWith('/matrix');

    vi.mocked(revalidatePath).mockClear();
    await reorderTasks({ listId: list.id, orderedTaskIds: [task.id] });
    expect(revalidatePath).toHaveBeenCalledWith('/matrix');

    vi.mocked(revalidatePath).mockClear();
    await deleteTask(task.id);
    expect(revalidatePath).toHaveBeenCalledWith('/matrix');

    vi.mocked(revalidatePath).mockClear();
    await deleteList(list.id);
    expect(revalidatePath).toHaveBeenCalledWith('/matrix');
  });
});
