// Pure reminder computation: which reminders are due at a given instant.
import { addDays } from '@/app/lib/calendar-dates';
import { formatTime } from '@/app/lib/date-format';
import { MINUTES_PER_DAY, UNTIMED_REMINDER_MINUTES, weekdayBit } from './offsets';
import { zonedDateKey, zonedDateTimeToUtc } from './zoned';

/** Reminders older than this when a dispatch runs are dropped, not sent late. */
export const REMINDER_CATCH_UP_MS = 15 * 60 * 1000;

export interface ReminderTask {
  id: string;
  text: string;
  /** 'YYYY-MM-DD' */
  due: string | null;
  dueTime: number | null;
  done: boolean;
  reminderOffset: number | null;
}

export interface ReminderHabit {
  id: string;
  name: string;
  freqType: 'DAILY' | 'WEEKLY';
  timesPerWeek: number | null;
  /** 'YYYY-MM-DD' */
  startDate: string;
  time: number | null;
  reminderOffset: number | null;
  reminderDays: number | null;
  /** Logged dates, 'YYYY-MM-DD'. */
  logs: string[];
}

export interface Reminder {
  kind: 'TASK' | 'HABIT';
  itemId: string;
  fireAt: Date;
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** 0 = Monday … 6 = Sunday. */
function mondayIndex(dateKey: string): number {
  return (new Date(`${dateKey}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function shortDate(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** When an open task's reminder fires, or null if it has none. */
export function taskFireAt(task: ReminderTask, timeZone: string): Date | null {
  if (task.done || !task.due || task.reminderOffset == null) return null;
  if (task.dueTime == null) {
    const days = Math.floor(task.reminderOffset / MINUTES_PER_DAY);
    return zonedDateTimeToUtc(addDays(task.due, -days), UNTIMED_REMINDER_MINUTES, timeZone);
  }
  return new Date(zonedDateTimeToUtc(task.due, task.dueTime, timeZone).getTime() - task.reminderOffset * 60_000);
}

/** Habit occurrences whose reminder fires in (windowStart, windowEnd]. */
export function habitFireTimes(
  habit: ReminderHabit,
  windowStart: Date,
  windowEnd: Date,
  timeZone: string
): { occurrence: string; fireAt: Date }[] {
  if (habit.time == null || habit.reminderOffset == null) return [];
  const offsetMs = habit.reminderOffset * 60_000;
  // The occurrence can be later than the fire day ("1 day before"), so scan
  // from the window's first local day to the day its end + offset lands on.
  const firstDay = addDays(zonedDateKey(windowStart, timeZone), -1);
  const lastDay = addDays(zonedDateKey(new Date(windowEnd.getTime() + offsetMs), timeZone), 1);
  const result: { occurrence: string; fireAt: Date }[] = [];
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    if (day < habit.startDate) continue;
    if (habit.freqType === 'WEEKLY' && !((habit.reminderDays ?? 0) & weekdayBit(mondayIndex(day)))) continue;
    const fireAt = new Date(zonedDateTimeToUtc(day, habit.time, timeZone).getTime() - offsetMs);
    if (fireAt > windowStart && fireAt <= windowEnd) result.push({ occurrence: day, fireAt });
  }
  return result;
}

function taskBody(task: ReminderTask, fireAt: Date, timeZone: string): string {
  const fireDay = zonedDateKey(fireAt, timeZone);
  const due = task.due!;
  const day = due === fireDay ? 'today' : due === addDays(fireDay, 1) ? 'tomorrow' : shortDate(due);
  return task.dueTime == null ? `Due ${day}` : `Due ${day} at ${formatTime(task.dueTime)}`;
}

function habitBody(habit: ReminderHabit, occurrence: string): string {
  const time = formatTime(habit.time!);
  if (habit.freqType !== 'WEEKLY') return time;
  const weekStart = addDays(occurrence, -mondayIndex(occurrence));
  const done = habit.logs.filter((d) => d >= weekStart && d < occurrence).length;
  return `${time} · ${done} of ${habit.timesPerWeek ?? 1} this week`;
}

/**
 * Every reminder that fires in (now − REMINDER_CATCH_UP_MS, now], skipping
 * done tasks and habits already logged on their occurrence day.
 */
export function dueReminders({
  tasks,
  habits,
  now,
  timeZone,
}: {
  tasks: ReminderTask[];
  habits: ReminderHabit[];
  now: Date;
  timeZone: string;
}): Reminder[] {
  const windowStart = new Date(now.getTime() - REMINDER_CATCH_UP_MS);
  const reminders: Reminder[] = [];

  for (const task of tasks) {
    const fireAt = taskFireAt(task, timeZone);
    if (!fireAt || fireAt <= windowStart || fireAt > now) continue;
    reminders.push({
      kind: 'TASK',
      itemId: task.id,
      fireAt,
      title: task.text,
      body: taskBody(task, fireAt, timeZone),
      url: '/tasks',
      tag: `task-${task.id}`,
    });
  }

  for (const habit of habits) {
    for (const { occurrence, fireAt } of habitFireTimes(habit, windowStart, now, timeZone)) {
      if (habit.logs.includes(occurrence)) continue;
      reminders.push({
        kind: 'HABIT',
        itemId: habit.id,
        fireAt,
        title: `Time for ${habit.name}`,
        body: habitBody(habit, occurrence),
        url: '/habits',
        tag: `habit-${habit.id}`,
      });
    }
  }

  return reminders;
}
