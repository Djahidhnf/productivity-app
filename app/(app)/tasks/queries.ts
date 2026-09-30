import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { requireUserId } from '@/app/lib/dal';
import { purgeExpiredTasks } from '@/app/lib/task-purge';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export type { TaskDTO };

export interface TaskListDTO {
  id: string;
  name: string;
  order: number;
  tasks: TaskDTO[];
}

export async function getTaskLists(): Promise<TaskListDTO[]> {
  const userId = await requireUserId();
  await purgeExpiredTasks();
  const lists = await prisma.taskList.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
    include: { tasks: { orderBy: { order: 'asc' } } },
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    order: list.order,
    tasks: list.tasks.map(serializeTask),
  }));
}
