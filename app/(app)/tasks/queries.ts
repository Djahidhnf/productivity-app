import { prisma } from '@/app/lib/prisma';
import type { Priority } from '@prisma/client';

export interface TaskDTO {
  id: string;
  text: string;
  listId: string;
  priority: Priority | null;
  due: string | null;
  dueTime: number | null;
  duration: number;
  done: boolean;
  order: number;
}

export interface TaskListDTO {
  id: string;
  name: string;
  order: number;
  tasks: TaskDTO[];
}

function toDateKey(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export async function getTaskLists(): Promise<TaskListDTO[]> {
  const lists = await prisma.taskList.findMany({
    orderBy: { order: 'asc' },
    include: { tasks: { orderBy: { order: 'asc' } } },
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    order: list.order,
    tasks: list.tasks.map((task) => ({
      id: task.id,
      text: task.text,
      listId: task.listId,
      priority: task.priority,
      due: toDateKey(task.due),
      dueTime: task.dueTime,
      duration: task.duration,
      done: task.done,
      order: task.order,
    })),
  }));
}
