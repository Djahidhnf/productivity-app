import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export type { TaskDTO };

export async function getCalendarTasks(): Promise<TaskDTO[]> {
  await verifySession();
  const tasks = await prisma.task.findMany({
    where: { due: { not: null } },
    orderBy: [{ due: 'asc' }, { dueTime: 'asc' }],
  });
  return tasks.map(serializeTask);
}
