/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach } from 'vitest';
import { prisma } from '@/app/lib/prisma';
import { purgeExpiredTasks, COMPLETED_TASK_TTL_MS } from './task-purge';

const HOUR = 60 * 60 * 1000;

describe('purgeExpiredTasks', () => {
  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'PurgeTest ' } } });
    await prisma.taskList.deleteMany({ where: { name: { startsWith: 'PurgeTest ' } } });
  });

  test('deletes tasks completed more than 72h ago and keeps everything else', async () => {
    expect(COMPLETED_TASK_TTL_MS).toBe(72 * HOUR);
    const now = new Date('2026-09-27T12:00:00.000Z');
    const list = await prisma.taskList.create({ data: { name: 'PurgeTest list', order: 9999 } });
    const make = (text: string, done: boolean, completedAt: Date | null) =>
      prisma.task.create({ data: { text, listId: list.id, order: 0, done, completedAt } });

    const expired = await make('PurgeTest expired', true, new Date(now.getTime() - 73 * HOUR));
    const recent = await make('PurgeTest recent', true, new Date(now.getTime() - 71 * HOUR));
    const open = await make('PurgeTest open', false, null);

    const deleted = await purgeExpiredTasks(now);
    expect(deleted).toBeGreaterThanOrEqual(1);

    expect(await prisma.task.findUnique({ where: { id: expired.id } })).toBeNull();
    expect(await prisma.task.findUnique({ where: { id: recent.id } })).not.toBeNull();
    expect(await prisma.task.findUnique({ where: { id: open.id } })).not.toBeNull();
  });
});
