import { PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import { formatTime } from '@/app/lib/date-format';
import { addDays, buildMonthGrid } from '@/app/lib/calendar-dates';
import type { TaskDTO } from './queries';
import type { CalView } from './calendar-view-pill';
import type { SwipeStrength } from '@/app/lib/use-swipe';

export const HOUR_PX = 64;

export function tasksByDate(tasks: TaskDTO[], dateKey: string): TaskDTO[] {
  return tasks.filter((t) => t.due === dateKey);
}

export function timedTasksByDate(tasks: TaskDTO[], dateKey: string): TaskDTO[] {
  return tasksByDate(tasks, dateKey).filter((t) => t.dueTime != null);
}

export function untimedTasksByDate(tasks: TaskDTO[], dateKey: string): TaskDTO[] {
  return tasksByDate(tasks, dateKey).filter((t) => t.dueTime == null);
}

const PRIORITY_ORDER: Array<NonNullable<TaskDTO['priority']>> = ['RED', 'AMBER', 'BLUE', 'GREEN'];

export function dayColor(tasks: TaskDTO[]): string {
  for (const priority of PRIORITY_ORDER) {
    if (tasks.some((t) => t.priority === priority)) return PRIORITY_COLORS[priority];
  }
  if (tasks.length > 0) return 'var(--accent)';
  return 'transparent';
}

export interface MonthCellData {
  dateKey: string;
  inMonth: boolean;
  chips: TaskDTO[];
  moreCount: number;
}

export interface AgendaItem {
  task: TaskDTO;
  timeLabel: string;
}

export interface AgendaGroup {
  dateKey: string;
  items: AgendaItem[];
}

export function buildAgendaGroups(tasks: TaskDTO[], startKey: string, days: number): AgendaGroup[] {
  const endKey = addDays(startKey, days - 1);
  const inRange = tasks.filter((t) => t.due !== null && t.due >= startKey && t.due <= endKey);
  const byDate = new Map<string, TaskDTO[]>();
  for (const task of inRange) {
    const key = task.due as string;
    const existing = byDate.get(key);
    if (existing) existing.push(task);
    else byDate.set(key, [task]);
  }
  return Array.from(byDate.keys())
    .sort()
    .map((dateKey) => {
      const items = byDate
        .get(dateKey)!
        .slice()
        .sort((a, b) => {
          const aUntimed = a.dueTime == null ? 1 : 0;
          const bUntimed = b.dueTime == null ? 1 : 0;
          if (aUntimed !== bUntimed) return aUntimed - bUntimed;
          return (a.dueTime ?? 0) - (b.dueTime ?? 0);
        })
        .map((task) => ({ task, timeLabel: task.dueTime != null ? formatTime(task.dueTime) : 'All day' }));
      return { dateKey, items };
    });
}

export function minutesFromOffset(offsetY: number, snapMinutes: number, mode: 'round' | 'floor' = 'round'): number {
  const rawMinutes = (offsetY / HOUR_PX) * 60;
  const snapped = (mode === 'floor' ? Math.floor : Math.round)(rawMinutes / snapMinutes) * snapMinutes;
  return Math.max(0, Math.min(24 * 60 - snapMinutes, snapped));
}

export const RANGE_SNAP_MINUTES = 15;

export interface MinuteRange {
  start: number;
  end: number;
}

/**
 * The time range covered by a drag between two 15-minute slots (each given
 * by its start minute), inclusive of both slots, in either direction.
 */
export function rangeFromDrag(anchorMinutes: number, currentMinutes: number): MinuteRange {
  return {
    start: Math.min(anchorMinutes, currentMinutes),
    end: Math.min(24 * 60, Math.max(anchorMinutes, currentMinutes) + RANGE_SNAP_MINUTES),
  };
}

export function swipeStepDays(view: CalView, strength: SwipeStrength): number {
  if (strength === 'short') return 1;
  return view === '3day' ? 3 : view === 'week' ? 7 : 1;
}

export function indexTasksByDate(tasks: TaskDTO[]): Map<string, TaskDTO[]> {
  const index = new Map<string, TaskDTO[]>();
  for (const task of tasks) {
    if (task.due === null) continue;
    const existing = index.get(task.due);
    if (existing) existing.push(task);
    else index.set(task.due, [task]);
  }
  return index;
}

export function buildMonthWeeks(index: Map<string, TaskDTO[]>, year: number, month: number): (MonthCellData | null)[][] {
  const grid = buildMonthGrid(year, month);
  const weeks: (MonthCellData | null)[][] = [];
  for (let start = 0; start < grid.length; start += 7) {
    const row = grid.slice(start, start + 7);
    if (!row.some((cell) => cell.inMonth)) continue;
    weeks.push(
      row.map((cell) => {
        if (!cell.inMonth) return null;
        const dayTasks = index.get(cell.dateKey) ?? [];
        return {
          dateKey: cell.dateKey,
          inMonth: true,
          chips: dayTasks.slice(0, 3),
          moreCount: Math.max(0, dayTasks.length - 3),
        };
      })
    );
  }
  return weeks;
}
