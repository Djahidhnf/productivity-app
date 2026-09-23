import type { FreqType } from '@prisma/client';
import { toDateKey } from './task-dto';

export interface HabitDTO {
  id: string;
  name: string;
  color: string;
  freqType: FreqType;
  timesPerWeek: number | null;
  startDate: string;
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
    order: habit.order,
    logs: habit.logs.map((log) => toDateKey(log.date)!),
  };
}
