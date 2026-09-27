'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { Priority } from '@prisma/client';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export async function createList(name: string): Promise<{ id: string; name: string; order: number }> {
  await verifySession();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('List name is required');
  const maxOrder = await prisma.taskList.aggregate({ _max: { order: true } });
  const list = await prisma.taskList.create({ data: { name: trimmed, order: (maxOrder._max.order ?? -1) + 1 } });
  revalidatePath('/tasks', 'layout');
  return { id: list.id, name: list.name, order: list.order };
}

export async function deleteList(listId: string): Promise<void> {
  await verifySession();
  await prisma.taskList.delete({ where: { id: listId } });
  revalidatePath('/tasks', 'layout');
}

export async function reorderLists(orderedIds: string[]): Promise<void> {
  await verifySession();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.taskList.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath('/tasks', 'layout');
}

export interface CreateTaskInput {
  text: string;
  listId: string;
  /** 'YYYY-MM-DD'; the task is undated when omitted. */
  due?: string | null;
}

export async function createTask(input: CreateTaskInput): Promise<TaskDTO> {
  await verifySession();
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error('Task text is required');
  const maxOrder = await prisma.task.aggregate({ where: { listId: input.listId }, _max: { order: true } });
  const task = await prisma.task.create({
    data: {
      text: trimmed,
      listId: input.listId,
      order: (maxOrder._max.order ?? -1) + 1,
      ...(input.due ? { due: new Date(input.due) } : {}),
    },
  });
  revalidatePath('/tasks', 'layout');
  return serializeTask(task);
}

export interface UpdateTaskInput {
  id: string;
  text: string;
  listId: string;
  priority: Priority | null;
  due: string | null;
  dueTime: number | null;
  /** Minutes; left unchanged when omitted. */
  duration?: number;
}

export async function updateTask(input: UpdateTaskInput): Promise<TaskDTO> {
  await verifySession();
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error('Task text is required');
  const task = await prisma.task.update({
    where: { id: input.id },
    data: {
      text: trimmed,
      listId: input.listId,
      priority: input.priority,
      due: input.due ? new Date(input.due) : null,
      dueTime: input.dueTime,
      ...(input.duration !== undefined ? { duration: Math.max(15, Math.min(24 * 60, Math.round(input.duration))) } : {}),
    },
  });
  revalidatePath('/tasks', 'layout');
  return serializeTask(task);
}

export async function deleteTask(taskId: string): Promise<void> {
  await verifySession();
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath('/tasks', 'layout');
}

export async function toggleTaskDone(taskId: string): Promise<TaskDTO> {
  await verifySession();
  const existing = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const task = await prisma.task.update({ where: { id: taskId }, data: { done: !existing.done } });
  revalidatePath('/tasks', 'layout');
  return serializeTask(task);
}

export interface ReorderTasksInput {
  listId: string;
  orderedTaskIds: string[];
}

export async function reorderTasks(input: ReorderTasksInput): Promise<void> {
  await verifySession();
  await prisma.$transaction(
    input.orderedTaskIds.map((id, index) =>
      prisma.task.update({ where: { id }, data: { listId: input.listId, order: index } })
    )
  );
  revalidatePath('/tasks', 'layout');
}

export interface PlaceMatrixTaskInput {
  taskId: string;
  priority: Priority | null;
  /** Every task ID of the destination matrix group, in its new order (including taskId). */
  orderedTaskIds: string[];
}

/** Sets a task's matrix group (priority) and saves that group's order in one transaction. */
export async function placeMatrixTask(input: PlaceMatrixTaskInput): Promise<void> {
  await verifySession();
  await prisma.$transaction([
    prisma.task.update({ where: { id: input.taskId }, data: { priority: input.priority } }),
    ...input.orderedTaskIds.map((id, index) => prisma.task.update({ where: { id }, data: { matrixOrder: index } })),
  ]);
  revalidatePath('/tasks', 'layout');
}
