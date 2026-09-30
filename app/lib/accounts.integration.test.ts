/**
 * @vitest-environment node
 */
import { describe, test, expect, afterAll, vi } from 'vitest';

// Same request-scope mocks as the other action/query integration tests; the
// session cookie is switched between accounts per test via signInAs().
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
import type { AccountId } from '@/app/lib/accounts';
import { createList, createTask, updateTask, deleteTask, toggleTaskDone } from '@/app/(app)/tasks/actions';
import { getTaskLists } from '@/app/(app)/tasks/queries';
import { getCalendarTasks } from '@/app/(app)/calendar/queries';
import { getMatrixTasks } from '@/app/(app)/matrix/queries';
import { createHabit, deleteHabit, toggleHabitLog } from '@/app/(app)/habits/actions';
import { getHabits } from '@/app/(app)/habits/queries';
import { createNote, deleteNote } from '@/app/(app)/notes/actions';
import { getNotes } from '@/app/(app)/notes/queries';
import { createFinanceEntry, deleteFinanceEntry } from '@/app/(app)/finance/actions';
import { getFinanceEntries } from '@/app/(app)/finance/queries';

async function signInAs(account: AccountId) {
  cookieStore.set(SESSION_COOKIE_NAME, await encryptSession({ sub: account, expiresAt: Date.now() + 60_000 }));
}

describe('account isolation', () => {
  afterAll(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'IsoTest ' } } });
    await prisma.taskList.deleteMany({ where: { name: { startsWith: 'IsoTest ' } } });
    await prisma.habit.deleteMany({ where: { name: { startsWith: 'IsoTest ' } } });
    await prisma.note.deleteMany({ where: { text: { startsWith: 'IsoTest ' } } });
    await prisma.financeEntry.deleteMany({ where: { note: { startsWith: 'IsoTest ' } } });
  });

  test("tasks and lists are only visible to and editable by their own account", async () => {
    await signInAs('owner');
    const list = await createList('IsoTest owner list');
    const task = await createTask({ text: 'IsoTest owner task', listId: list.id, due: '2026-10-01' });
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toMatchObject({ userId: 'owner' });

    await signInAs('second');
    const lists = await getTaskLists();
    expect(lists.some((l) => l.id === list.id)).toBe(false);
    expect((await getCalendarTasks()).some((t) => t.id === task.id)).toBe(false);
    expect((await getMatrixTasks()).some((t) => t.id === task.id)).toBe(false);

    await expect(createTask({ text: 'IsoTest intruder', listId: list.id })).rejects.toThrow();
    await expect(toggleTaskDone(task.id)).rejects.toThrow();
    await expect(
      updateTask({ id: task.id, text: 'IsoTest hijacked', listId: list.id, priority: null, due: null, dueTime: null })
    ).rejects.toThrow();
    await expect(deleteTask(task.id)).rejects.toThrow();

    const secondList = await createList('IsoTest second list');
    await expect(
      updateTask({ id: task.id, text: 'IsoTest moved', listId: secondList.id, priority: null, due: null, dueTime: null })
    ).rejects.toThrow();

    await signInAs('owner');
    await expect(
      updateTask({ id: task.id, text: 'IsoTest moved', listId: secondList.id, priority: null, due: null, dueTime: null })
    ).rejects.toThrow();
    const unchanged = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(unchanged).toMatchObject({ text: 'IsoTest owner task', done: false, listId: list.id });
  });

  test('habits, notes and finance entries are scoped to their account', async () => {
    await signInAs('second');
    const habit = await createHabit({ name: 'IsoTest habit', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    const note = await createNote('IsoTest note');
    const entry = await createFinanceEntry({ type: 'EXPENSE', amount: 500, category: 'Other', note: 'IsoTest entry', date: '2026-09-15' });
    expect((await getHabits()).map((h) => h.id)).toContain(habit.id);

    await signInAs('owner');
    expect((await getHabits()).some((h) => h.id === habit.id)).toBe(false);
    expect((await getNotes()).some((n) => n.id === note.id)).toBe(false);
    expect((await getFinanceEntries('2026-09', '2026-09')).some((e) => e.id === entry.id)).toBe(false);
    await expect(toggleHabitLog(habit.id, '2026-09-20')).rejects.toThrow();
    await expect(deleteHabit(habit.id)).rejects.toThrow();
    await expect(deleteNote(note.id)).rejects.toThrow();
    await expect(deleteFinanceEntry(entry.id)).rejects.toThrow();

    expect(await prisma.habit.count({ where: { id: habit.id } })).toBe(1);
    expect(await prisma.habitLog.count({ where: { habitId: habit.id } })).toBe(0);
    expect(await prisma.note.count({ where: { id: note.id } })).toBe(1);
    expect(await prisma.financeEntry.count({ where: { id: entry.id } })).toBe(1);
  });
});
