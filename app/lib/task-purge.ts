import 'server-only';
import { prisma } from '@/app/lib/prisma';

/** Done tasks are deleted this long after they were completed. */
export const COMPLETED_TASK_TTL_MS = 72 * 60 * 60 * 1000;

/**
 * Deletes done tasks completed more than 72h before `now`. Called lazily at
 * the top of every task-reading query instead of on a schedule, so expired
 * tasks vanish the next time any task page loads.
 */
export async function purgeExpiredTasks(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.task.deleteMany({
    where: { done: true, completedAt: { lt: new Date(now.getTime() - COMPLETED_TASK_TTL_MS) } },
  });
  return count;
}
