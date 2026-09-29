import type { TaskDTO } from '@/app/lib/task-dto';
import type { HabitDTO } from '@/app/lib/habit-dto';

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
