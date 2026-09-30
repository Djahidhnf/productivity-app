import type { FreqType } from '@prisma/client';
import { toDateKey } from './task-dto';

export interface HabitDTO {
  id: string;
  name: string;
  color: string;
  freqType: FreqType;
  timesPerWeek: number | null;
  startDate: string;
  /** Minutes after local midnight. */
  time: number | null;
  reminderOffset: number | null;
  /** Weekday mask, bit 0 = Monday. */
  reminderDays: number | null;
  order: number;
  logs: string[];
}

export function serializeHabit(habit: {
  id: string;
  name: string;
  color: string;
  freqType: FreqType;
  timesPerWeek: number | null;
  startDate: Date;
  time: number | null;
  reminderOffset: number | null;
  reminderDays: number | null;
  order: number;
  logs: { date: Date }[];
}): HabitDTO {
  return {
    id: habit.id,
    name: habit.name,
    color: habit.color,
    freqType: habit.freqType,
    timesPerWeek: habit.timesPerWeek,
    startDate: toDateKey(habit.startDate)!,
    time: habit.time,
    reminderOffset: habit.reminderOffset,
    reminderDays: habit.reminderDays,
    order: habit.order,
    logs: habit.logs.map((log) => toDateKey(log.date)!),
  };
}
