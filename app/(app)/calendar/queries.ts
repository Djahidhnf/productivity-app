import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { requireUserId } from '@/app/lib/dal';
import { purgeExpiredTasks } from '@/app/lib/task-purge';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export type { TaskDTO };

export async function getCalendarTasks(): Promise<TaskDTO[]> {
  const userId = await requireUserId();
  await purgeExpiredTasks();
  const tasks = await prisma.task.findMany({
    where: { userId, due: { not: null } },
    orderBy: [{ due: 'asc' }, { dueTime: 'asc' }],
  });
  return tasks.map(serializeTask);
}
