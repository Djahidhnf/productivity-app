import { describe, test, expect, afterAll } from 'vitest';
import { prisma } from '@/app/lib/prisma';

describe('prisma TaskList/Task', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('creates a list and a task, and cascade-deletes the task when the list is deleted', async () => {
    const list = await prisma.taskList.create({ data: { userId: 'owner', name: 'Integration test list', order: 0 } });
    const task = await prisma.task.create({
      data: { userId: 'owner', text: 'Integration test task', listId: list.id, order: 0 },
    });

    const found = await prisma.task.findUnique({ where: { id: task.id } });
    expect(found?.text).toBe('Integration test task');
    expect(found?.priority).toBeNull();
    expect(found?.done).toBe(false);

    await prisma.taskList.delete({ where: { id: list.id } });
    const afterDelete = await prisma.task.findUnique({ where: { id: task.id } });
    expect(afterDelete).toBeNull();
  });

  test('enforces one HabitLog per habit per date', async () => {
    const habit = await prisma.habit.create({
      data: { userId: 'owner', name: 'Integration test habit', color: '#c6ff34', freqType: 'DAILY', startDate: new Date('2026-01-01'), order: 0 },
    });
    await prisma.habitLog.create({ data: { habitId: habit.id, date: new Date('2026-01-02') } });

    await expect(
      prisma.habitLog.create({ data: { habitId: habit.id, date: new Date('2026-01-02') } })
    ).rejects.toThrow();

    await prisma.habit.delete({ where: { id: habit.id } });
  });
});
