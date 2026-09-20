import { describe, test, expect, afterEach } from 'vitest';
import { prisma } from '@/app/lib/prisma';
import { getTaskLists } from './queries';

describe('getTaskLists', () => {
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
