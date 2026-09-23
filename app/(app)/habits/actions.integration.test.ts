/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';

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
import { createHabit, updateHabit, deleteHabit, reorderHabits, toggleHabitLog } from './actions';

describe('habit server actions', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
  });

  afterEach(async () => {
    await prisma.habit.deleteMany({ where: { name: { startsWith: 'ActionTest ' } } });
  });

  test('createHabit assigns the next order and cycles through HABIT_COLORS', async () => {
    const maxBefore = await prisma.habit.aggregate({ _max: { order: true } });
    const habit = await createHabit({ name: 'ActionTest Daily', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    expect(habit.order).toBe((maxBefore._max.order ?? -1) + 1);
    expect(habit.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(habit.timesPerWeek).toBeNull();
    expect(habit.logs).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('createHabit clamps timesPerWeek to 1-7 for weekly habits', async () => {
    const habit = await createHabit({ name: 'ActionTest Weekly', freqType: 'WEEKLY', timesPerWeek: 99, startDate: '2026-09-01' });
    expect(habit.timesPerWeek).toBe(7);
    const habit2 = await createHabit({ name: 'ActionTest Weekly2', freqType: 'WEEKLY', timesPerWeek: 0, startDate: '2026-09-01' });
    expect(habit2.timesPerWeek).toBe(1);
  });

  test('createHabit rejects an empty name', async () => {
    await expect(createHabit({ name: '   ', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' })).rejects.toThrow();
  });

  test('updateHabit preserves color, order, and logs', async () => {
    const habit = await createHabit({ name: 'ActionTest ToEdit', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    await toggleHabitLog(habit.id, '2026-09-10');
    vi.mocked(revalidatePath).mockClear();
    const updated = await updateHabit({ id: habit.id, name: 'ActionTest Edited', freqType: 'WEEKLY', timesPerWeek: 4, startDate: '2026-09-02' });
    expect(updated.name).toBe('ActionTest Edited');
    expect(updated.freqType).toBe('WEEKLY');
    expect(updated.timesPerWeek).toBe(4);
    expect(updated.startDate).toBe('2026-09-02');
    expect(updated.color).toBe(habit.color);
    expect(updated.order).toBe(habit.order);
    expect(updated.logs).toEqual(['2026-09-10']);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('deleteHabit cascades to delete its logs', async () => {
    const habit = await createHabit({ name: 'ActionTest ToDelete', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    await toggleHabitLog(habit.id, '2026-09-10');
    vi.mocked(revalidatePath).mockClear();
    await deleteHabit(habit.id);
    const found = await prisma.habit.findUnique({ where: { id: habit.id } });
    expect(found).toBeNull();
    const logs = await prisma.habitLog.findMany({ where: { habitId: habit.id } });
    expect(logs).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('reorderHabits sets each habit order to its array index', async () => {
    const a = await createHabit({ name: 'ActionTest ReorderA', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    const b = await createHabit({ name: 'ActionTest ReorderB', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    vi.mocked(revalidatePath).mockClear();
    await reorderHabits([b.id, a.id]);
    const refreshedA = await prisma.habit.findUniqueOrThrow({ where: { id: a.id } });
    const refreshedB = await prisma.habit.findUniqueOrThrow({ where: { id: b.id } });
    expect(refreshedB.order).toBe(0);
    expect(refreshedA.order).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('toggleHabitLog creates then deletes a log for the same date', async () => {
    const habit = await createHabit({ name: 'ActionTest Toggle', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    vi.mocked(revalidatePath).mockClear();
    await toggleHabitLog(habit.id, '2026-09-15');
    let logs = await prisma.habitLog.findMany({ where: { habitId: habit.id } });
    expect(logs).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);

    vi.mocked(revalidatePath).mockClear();
    await toggleHabitLog(habit.id, '2026-09-15');
    logs = await prisma.habitLog.findMany({ where: { habitId: habit.id } });
    expect(logs).toHaveLength(0);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
