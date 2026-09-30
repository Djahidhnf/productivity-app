// Reminder offsets are minutes before the due time: null = never, 0 = on time.
// Shared by the pickers (client) and the actions/dispatcher (server).

export const MINUTES_PER_DAY = 1440;
/** Untimed tasks (a due date but no time) count from 09:00 local on the day. */
export const UNTIMED_REMINDER_MINUTES = 9 * 60;
export const MAX_CUSTOM_AMOUNT = 999;

export type ReminderMode = 'timed' | 'untimed' | 'disabled';
export type ReminderUnit = 'minutes' | 'hours' | 'days';

export const UNIT_MINUTES: Record<ReminderUnit, number> = { minutes: 1, hours: 60, days: MINUTES_PER_DAY };

/** timed: a due date and time; untimed: a date only; disabled: no due date. */
export function taskReminderMode(due: string | null | undefined, dueTime: number | null | undefined): ReminderMode {
  if (!due) return 'disabled';
  return dueTime == null ? 'untimed' : 'timed';
}

export function isValidReminderOffset(offset: number, mode: ReminderMode): boolean {
  if (mode === 'disabled' || !Number.isInteger(offset) || offset < 0) return false;
  if (offset > MAX_CUSTOM_AMOUNT * MINUTES_PER_DAY) return false;
  return mode === 'timed' || offset % MINUTES_PER_DAY === 0;
}

/**
 * The offset to store for an item in `mode`: null when reminders aren't
 * possible or none was asked for; an offset the mode can't express (e.g.
 * "30 min before" on a task that just lost its time) falls back to 0.
 */
export function normalizeReminderOffset(offset: number | null | undefined, mode: ReminderMode): number | null {
  if (offset == null || mode === 'disabled') return null;
  return isValidReminderOffset(offset, mode) ? offset : 0;
}

/** The largest unit that divides the offset evenly (days only in untimed mode). */
export function decomposeOffset(offset: number, mode: ReminderMode = 'timed'): { amount: number; unit: ReminderUnit } {
  if (mode === 'untimed' || (offset > 0 && offset % MINUTES_PER_DAY === 0)) {
    return { amount: Math.round(offset / MINUTES_PER_DAY), unit: 'days' };
  }
  if (offset > 0 && offset % 60 === 0) return { amount: offset / 60, unit: 'hours' };
  return { amount: offset, unit: 'minutes' };
}

/** Short human label, e.g. "30 min before", "On time", "On the day (9:00)". */
export function describeReminderOffset(offset: number, mode: ReminderMode): string {
  if (offset === 0) return mode === 'untimed' ? 'On the day (9:00)' : 'On time';
  const { amount, unit } = decomposeOffset(offset, mode);
  const label = unit === 'minutes' ? 'min' : amount === 1 ? unit.slice(0, -1) : unit;
  return `${amount} ${label} before`;
}

/** Bit for a weekday in Habit.reminderDays; 0 = Monday … 6 = Sunday. */
export function weekdayBit(mondayIndex: number): number {
  return 1 << mondayIndex;
}

export const ALL_WEEKDAYS_MASK = 0b1111111;
