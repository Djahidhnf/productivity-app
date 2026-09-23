import type { FreqType } from '@prisma/client';
import { addDays, buildMonthGrid, shortDateLabel } from '@/app/lib/calendar-dates';

export function habitStreak(logs: string[], todayKey: string): number {
  const logged = new Set(logs);
  let count = 0;
  let cursor = logged.has(todayKey) ? todayKey : addDays(todayKey, -1);
  while (logged.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function habitMonthlyPct(
  habit: { freqType: FreqType; timesPerWeek: number | null },
  logs: string[],
  todayKey: string
): number {
  const monthStartKey = `${todayKey.slice(0, 8)}01`;
  const daysElapsed = Number(todayKey.slice(-2));
  const completions = logs.filter((d) => d >= monthStartKey && d <= todayKey).length;
  let goal: number;
  if (habit.freqType === 'DAILY') {
    goal = daysElapsed;
  } else {
    const weeksElapsed = Math.max(1, Math.ceil(daysElapsed / 7));
    goal = weeksElapsed * (habit.timesPerWeek || 1);
  }
  return Math.min(100, Math.round((completions / Math.max(goal, 1)) * 100));
}

export interface HeatCell {
  dateKey: string;
  logged: boolean;
  future: boolean;
  beforeStart: boolean;
}

export function buildHeatCells(
  logs: string[],
  startDate: string,
  todayKey: string,
  weeks: number
): { cells: HeatCell[]; startLabel: string } {
  const logged = new Set(logs);
  const gridStart = addDays(todayKey, -(weeks * 7 - 1));
  const cells: HeatCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const dateKey = addDays(gridStart, i);
    cells.push({
      dateKey,
      logged: logged.has(dateKey),
      future: dateKey > todayKey,
      beforeStart: dateKey < startDate,
    });
  }
  return { cells, startLabel: shortDateLabel(gridStart) };
}

export interface HabitMonthCell {
  dateKey: string;
  inMonth: boolean;
  logged: boolean;
  isToday: boolean;
  future: boolean;
  dayNum: number;
}

export function buildHabitMonthCells(logs: string[], monthKey: string, todayKey: string): HabitMonthCell[] {
  const logged = new Set(logs);
  const [year, month] = monthKey.split('-').map(Number);
  return buildMonthGrid(year, month - 1).map((cell) => ({
    dateKey: cell.dateKey,
    inMonth: cell.inMonth,
    logged: logged.has(cell.dateKey),
    isToday: cell.dateKey === todayKey,
    future: cell.dateKey > todayKey,
    dayNum: Number(cell.dateKey.slice(-2)),
  }));
}

export function moveHabit<T extends { id: string }>(habits: T[], draggedId: string, targetId: string): T[] {
  if (draggedId === targetId) return habits;
  const dragged = habits.find((h) => h.id === draggedId);
  if (!dragged) return habits;
  const without = habits.filter((h) => h.id !== draggedId);
  const targetIndex = without.findIndex((h) => h.id === targetId);
  const at = targetIndex === -1 ? without.length : targetIndex + 1;
  const next = [...without];
  next.splice(at, 0, dragged);
  return next;
}
