import type { TaskDTO } from '@/app/lib/task-dto';
import type { HabitDTO } from '@/app/lib/habit-dto';

const PRIORITY_RANK: Record<string, number> = { RED: 0, AMBER: 1, BLUE: 2, GREEN: 3 };
const NO_PRIORITY_RANK = 4;

function compareTasks(a: TaskDTO, b: TaskDTO): number {
  const rank = (PRIORITY_RANK[a.priority ?? ''] ?? NO_PRIORITY_RANK) - (PRIORITY_RANK[b.priority ?? ''] ?? NO_PRIORITY_RANK);
  if (rank !== 0) return rank;
  if (a.due !== b.due) return (a.due ?? '') < (b.due ?? '') ? -1 : 1;
  if (a.dueTime !== b.dueTime) return (a.dueTime ?? Infinity) - (b.dueTime ?? Infinity);
  return a.order - b.order;
}

/**
 * Tasks due today or overdue, highest priority first. Done ones are dropped
 * unless listed in `keepIds` (ticked off on this page, so they can be undone).
 */
export function tasksForToday(tasks: TaskDTO[], todayKey: string, keepIds: ReadonlySet<string> = new Set()): TaskDTO[] {
  return tasks.filter((t) => t.due !== null && t.due <= todayKey && (!t.done || keepIds.has(t.id))).sort(compareTasks);
}

/** Today's timed tasks in time order, done ones included. */
export function scheduleForToday(tasks: TaskDTO[], todayKey: string): TaskDTO[] {
  return tasks.filter((t) => t.due === todayKey && t.dueTime !== null).sort((a, b) => a.dueTime! - b.dueTime!);
}

/** Habits already started by `todayKey`, in their saved order. */
export function habitsForToday(habits: HabitDTO[], todayKey: string): HabitDTO[] {
  return habits.filter((h) => h.startDate <= todayKey);
}

/** "Saturday, September 26" */
export function longDateLabel(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
