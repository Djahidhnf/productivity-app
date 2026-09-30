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
import { getHabits } from './queries';

describe('getHabits', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.habit.deleteMany({ where: { name: { startsWith: 'HabitsQueryTest ' } } });
  });

  test('returns habits ordered by order, with their logs as date-key strings', async () => {
    const b = await prisma.habit.create({
      data: { userId: 'owner', name: 'HabitsQueryTest B', color: '#60a5fa', freqType: 'DAILY', startDate: new Date('2026-01-01'), order: 1 },
    });
    const a = await prisma.habit.create({
      data: { userId: 'owner', name: 'HabitsQueryTest A', color: '#c6ff34', freqType: 'WEEKLY', timesPerWeek: 3, startDate: new Date('2026-01-01'), order: 0 },
    });
    await prisma.habitLog.create({ data: { habitId: a.id, date: new Date('2026-09-20') } });
    await prisma.habitLog.create({ data: { habitId: a.id, date: new Date('2026-09-21') } });

    const result = await getHabits();
    const names = result.map((h) => h.name);
    expect(names.indexOf('HabitsQueryTest A')).toBeLessThan(names.indexOf('HabitsQueryTest B'));

    const habitA = result.find((h) => h.id === a.id)!;
    expect(habitA.logs.sort()).toEqual(['2026-09-20', '2026-09-21']);
    expect(habitA.freqType).toBe('WEEKLY');
    expect(habitA.timesPerWeek).toBe(3);
    expect(habitA.startDate).toBe('2026-01-01');

    const habitB = result.find((h) => h.id === b.id)!;
    expect(habitB.logs).toEqual([]);
    expect(habitB.timesPerWeek).toBeNull();

    await prisma.habit.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  });
});
