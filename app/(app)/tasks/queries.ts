import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export type { TaskDTO };

export interface TaskListDTO {
  id: string;
  name: string;
  order: number;
  tasks: TaskDTO[];
}

export async function getTaskLists(): Promise<TaskListDTO[]> {
  await verifySession();
  const lists = await prisma.taskList.findMany({
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
