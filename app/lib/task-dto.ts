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
  completedAt: string | null;
  order: number;
}

// Task.due is a Postgres `@db.Date` column, which Prisma always returns as a
// UTC-midnight Date regardless of server timezone — a plain UTC slice is the
// correct (and only) way to turn it back into the 'YYYY-MM-DD' key every DTO
// consumer expects. This is unrelated to the LOCAL-time "is this today?"
// comparison in app/lib/date-format.ts, which deliberately does not use this.
export function toDateKey(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export function serializeTask(task: {
  id: string;
  text: string;
  listId: string;
  priority: Priority | null;
  due: Date | null;
  dueTime: number | null;
  duration: number;
  done: boolean;
  completedAt: Date | null;
  order: number;
}): TaskDTO {
  return {
    id: task.id,
    text: task.text,
    listId: task.listId,
    priority: task.priority,
    due: toDateKey(task.due),
    dueTime: task.dueTime,
    duration: task.duration,
    done: task.done,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    order: task.order,
  };
}
