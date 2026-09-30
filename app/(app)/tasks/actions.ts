'use server';

import { prisma } from '@/app/lib/prisma';
import { requireUserId } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { Priority } from '@prisma/client';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';
import { normalizeReminderOffset, taskReminderMode } from '@/app/lib/reminders/offsets';

/** Throws unless the list exists and belongs to this account. */
async function assertOwnList(userId: string, listId: string): Promise<void> {
  await prisma.taskList.findFirstOrThrow({ where: { id: listId, userId }, select: { id: true } });
}

export async function createList(name: string): Promise<{ id: string; name: string; order: number }> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('List name is required');
  const maxOrder = await prisma.taskList.aggregate({ where: { userId }, _max: { order: true } });
  const list = await prisma.taskList.create({ data: { userId, name: trimmed, order: (maxOrder._max.order ?? -1) + 1 } });
  revalidatePath('/tasks', 'layout');
  return { id: list.id, name: list.name, order: list.order };
}

export async function deleteList(listId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.taskList.delete({ where: { id: listId, userId } });
  revalidatePath('/tasks', 'layout');
}

export async function reorderLists(orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.taskList.update({ where: { id, userId }, data: { order: index } }))
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
  const userId = await requireUserId();
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error('Task text is required');
  await assertOwnList(userId, input.listId);
  const maxOrder = await prisma.task.aggregate({ where: { listId: input.listId }, _max: { order: true } });
  const task = await prisma.task.create({
    data: {
      userId,
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
  /** Minutes before due (null = never); left unchanged when omitted, but always refitted to the new due date/time. */
  reminderOffset?: number | null;
}

export async function updateTask(input: UpdateTaskInput): Promise<TaskDTO> {
  const userId = await requireUserId();
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error('Task text is required');
  await assertOwnList(userId, input.listId);
  if (input.reminderOffset != null && !Number.isFinite(input.reminderOffset)) throw new Error('Invalid reminder');
  const reminderOffset =
    input.reminderOffset !== undefined
      ? input.reminderOffset
      : (await prisma.task.findUniqueOrThrow({ where: { id: input.id, userId }, select: { reminderOffset: true } })).reminderOffset;
  const task = await prisma.task.update({
    where: { id: input.id, userId },
    data: {
      reminderOffset: normalizeReminderOffset(reminderOffset, taskReminderMode(input.due, input.dueTime)),
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
  const userId = await requireUserId();
  await prisma.task.delete({ where: { id: taskId, userId } });
  revalidatePath('/tasks', 'layout');
}

export async function toggleTaskDone(taskId: string): Promise<TaskDTO> {
  const userId = await requireUserId();
  const existing = await prisma.task.findUniqueOrThrow({ where: { id: taskId, userId } });
  const done = !existing.done;
  const task = await prisma.task.update({
    where: { id: taskId, userId },
    data: { done, completedAt: done ? new Date() : null },
  });
  revalidatePath('/tasks', 'layout');
  return serializeTask(task);
}

export interface ReorderTasksInput {
  listId: string;
  orderedTaskIds: string[];
}

export async function reorderTasks(input: ReorderTasksInput): Promise<void> {
  const userId = await requireUserId();
  await assertOwnList(userId, input.listId);
  await prisma.$transaction(
    input.orderedTaskIds.map((id, index) =>
      prisma.task.update({ where: { id, userId }, data: { listId: input.listId, order: index } })
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
  const userId = await requireUserId();
  await prisma.$transaction([
    prisma.task.update({ where: { id: input.taskId, userId }, data: { priority: input.priority } }),
    ...input.orderedTaskIds.map((id, index) => prisma.task.update({ where: { id, userId }, data: { matrixOrder: index } })),
  ]);
  revalidatePath('/tasks', 'layout');
}
