'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { Priority } from '@prisma/client';
import type { TaskDTO } from './queries';

function serializeTask(task: {
  id: string;
  text: string;
  listId: string;
  priority: Priority | null;
  due: Date | null;
  dueTime: number | null;
  duration: number;
  done: boolean;
  order: number;
}): TaskDTO {
  return {
    id: task.id,
    text: task.text,
    listId: task.listId,
    priority: task.priority,
    due: task.due ? task.due.toISOString().slice(0, 10) : null,
    dueTime: task.dueTime,
    duration: task.duration,
    done: task.done,
    order: task.order,
  };
}

export async function createList(name: string): Promise<{ id: string; name: string; order: number }> {
  await verifySession();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('List name is required');
  const maxOrder = await prisma.taskList.aggregate({ _max: { order: true } });
  const list = await prisma.taskList.create({ data: { name: trimmed, order: (maxOrder._max.order ?? -1) + 1 } });
  revalidatePath('/tasks');
  return { id: list.id, name: list.name, order: list.order };
}

export async function deleteList(listId: string): Promise<void> {
  await verifySession();
  await prisma.taskList.delete({ where: { id: listId } });
  revalidatePath('/tasks');
}

export async function reorderLists(orderedIds: string[]): Promise<void> {
  await verifySession();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.taskList.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath('/tasks');
}

export interface CreateTaskInput {
  text: string;
  listId: string;
}

export async function createTask(input: CreateTaskInput): Promise<TaskDTO> {
  await verifySession();
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error('Task text is required');
  const maxOrder = await prisma.task.aggregate({ where: { listId: input.listId }, _max: { order: true } });
  const task = await prisma.task.create({
    data: { text: trimmed, listId: input.listId, order: (maxOrder._max.order ?? -1) + 1 },
  });
  revalidatePath('/tasks');
  return serializeTask(task);
}

export interface UpdateTaskInput {
  id: string;
  text: string;
  listId: string;
  priority: Priority | null;
  due: string | null;
  dueTime: number | null;
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
    },
  });
  revalidatePath('/tasks');
  return serializeTask(task);
}

export async function deleteTask(taskId: string): Promise<void> {
  await verifySession();
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath('/tasks');
}

export async function toggleTaskDone(taskId: string): Promise<TaskDTO> {
  await verifySession();
  const existing = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const task = await prisma.task.update({ where: { id: taskId }, data: { done: !existing.done } });
  revalidatePath('/tasks');
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
  revalidatePath('/tasks');
}
