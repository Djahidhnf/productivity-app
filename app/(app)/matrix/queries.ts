import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { requireUserId } from '@/app/lib/dal';
import { purgeExpiredTasks } from '@/app/lib/task-purge';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export type { TaskDTO };

export async function getMatrixTasks(): Promise<TaskDTO[]> {
  const userId = await requireUserId();
  await purgeExpiredTasks();
  const tasks = await prisma.task.findMany({
    where: { userId, done: false },
    orderBy: [{ matrixOrder: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
  });
  return tasks.map(serializeTask);
}
