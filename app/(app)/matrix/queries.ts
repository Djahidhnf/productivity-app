import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export type { TaskDTO };

export async function getMatrixTasks(): Promise<TaskDTO[]> {
  await verifySession();
  const tasks = await prisma.task.findMany({
    where: { done: false },
    orderBy: { createdAt: 'asc' },
  });
  return tasks.map(serializeTask);
}
