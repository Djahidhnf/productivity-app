import { describe, test, expect } from 'vitest';
import { taskFireAt, habitFireTimes, dueReminders, REMINDER_CATCH_UP_MS, type ReminderTask, type ReminderHabit } from './compute';

const TZ = 'Africa/Algiers'; // UTC+1, no DST

function task(overrides: Partial<ReminderTask> = {}): ReminderTask {
  return { id: 't1', text: 'Call the bank', due: '2026-10-05', dueTime: 14 * 60, done: false, reminderOffset: 30, ...overrides };
}

function habit(overrides: Partial<ReminderHabit> = {}): ReminderHabit {
  return {
    id: 'h1',
    name: 'Stretch',
    freqType: 'DAILY',
    timesPerWeek: null,
    startDate: '2026-09-01',
    time: 7 * 60 + 30,
    reminderOffset: 0,
    reminderDays: null,
    logs: [],
    ...overrides,
  };
}

describe('taskFireAt', () => {
  test('timed: due time minus offset, in the zone', () => {
    // 14:00 Algiers = 13:00Z; 30 min before = 12:30Z.
    expect(taskFireAt(task(), TZ)?.toISOString()).toBe('2026-10-05T12:30:00.000Z');
    expect(taskFireAt(task({ reminderOffset: 0 }), TZ)?.toISOString()).toBe('2026-10-05T13:00:00.000Z');
  });

  test('untimed: 09:00 local on the day, or whole days before', () => {
    expect(taskFireAt(task({ dueTime: null, reminderOffset: 0 }), TZ)?.toISOString()).toBe('2026-10-05T08:00:00.000Z');
    expect(taskFireAt(task({ dueTime: null, reminderOffset: 2 * 1440 }), TZ)?.toISOString()).toBe('2026-10-03T08:00:00.000Z');
  });

  test('none without a due date, without a reminder, or when done', () => {
    expect(taskFireAt(task({ due: null }), TZ)).toBeNull();
    expect(taskFireAt(task({ reminderOffset: null }), TZ)).toBeNull();
    expect(taskFireAt(task({ done: true }), TZ)).toBeNull();
  });
});

describe('habitFireTimes', () => {
  const start = new Date('2026-10-05T00:00:00Z');
  const end = new Date('2026-10-08T00:00:00Z');

  test('daily: one per day at the time, in the zone', () => {
    const fires = habitFireTimes(habit(), start, end, TZ);
    expect(fires.map((f) => f.fireAt.toISOString())).toEqual([
      '2026-10-05T06:30:00.000Z',
      '2026-10-06T06:30:00.000Z',
      '2026-10-07T06:30:00.000Z',
    ]);
  });

  test('weekly: only on masked weekdays (bit 0 = Monday)', () => {
    // 2026-10-05 is a Monday; mask Monday + Wednesday.
    const fires = habitFireTimes(habit({ freqType: 'WEEKLY', timesPerWeek: 2, reminderDays: 0b0000101 }), start, end, TZ);
    expect(fires.map((f) => f.occurrence)).toEqual(['2026-10-05', '2026-10-07']);
  });

  test('none before the start date, without a time, or without a reminder', () => {
    expect(habitFireTimes(habit({ startDate: '2026-10-07' }), start, end, TZ).map((f) => f.occurrence)).toEqual(['2026-10-07']);
    expect(habitFireTimes(habit({ time: null }), start, end, TZ)).toEqual([]);
    expect(habitFireTimes(habit({ reminderOffset: null }), start, end, TZ)).toEqual([]);
  });

  test('"1 day before" fires on the previous day for the next occurrence', () => {
    const windowStart = new Date('2026-10-05T06:00:00Z');
    const windowEnd = new Date('2026-10-05T07:00:00Z');
    const fires = habitFireTimes(habit({ reminderOffset: 1440 }), windowStart, windowEnd, TZ);
    expect(fires).toEqual([{ occurrence: '2026-10-06', fireAt: new Date('2026-10-05T06:30:00Z') }]);
  });
});

describe('dueReminders', () => {
  const fire = new Date('2026-10-05T12:30:00Z'); // task() fire time

  test('includes a reminder firing exactly now, with a friendly body', () => {
    const [r] = dueReminders({ tasks: [task()], habits: [], now: fire, timeZone: TZ });
    expect(r).toMatchObject({ kind: 'TASK', itemId: 't1', title: 'Call the bank', body: 'Due today at 2:00PM', url: '/tasks', tag: 'task-t1' });
    expect(r.fireAt).toEqual(fire);
  });

  test('keeps reminders up to the catch-up window and drops older ones', () => {
    const justInside = new Date(fire.getTime() + REMINDER_CATCH_UP_MS - 1);
    const exactlyOld = new Date(fire.getTime() + REMINDER_CATCH_UP_MS);
    expect(dueReminders({ tasks: [task()], habits: [], now: justInside, timeZone: TZ })).toHaveLength(1);
    expect(dueReminders({ tasks: [task()], habits: [], now: exactlyOld, timeZone: TZ })).toHaveLength(0);
    expect(dueReminders({ tasks: [task()], habits: [], now: new Date(fire.getTime() - 1), timeZone: TZ })).toHaveLength(0);
  });

  test('task body says tomorrow / a date for earlier reminders', () => {
    const dayBefore = task({ reminderOffset: 1440 });
    const now = new Date('2026-10-04T13:00:00Z');
    expect(dueReminders({ tasks: [dayBefore], habits: [], now, timeZone: TZ })[0].body).toBe('Due tomorrow at 2:00PM');
    const untimed = task({ dueTime: null, reminderOffset: 3 * 1440 });
    expect(dueReminders({ tasks: [untimed], habits: [], now: new Date('2026-10-02T08:00:00Z'), timeZone: TZ })[0].body).toBe('Due Oct 5');
  });

  test('skips habits already logged for the occurrence day', () => {
    const now = new Date('2026-10-05T06:30:00Z');
    expect(dueReminders({ tasks: [], habits: [habit()], now, timeZone: TZ })).toHaveLength(1);
    expect(dueReminders({ tasks: [], habits: [habit({ logs: ['2026-10-05'] })], now, timeZone: TZ })).toHaveLength(0);
  });

  test('weekly habit body counts this week’s logs before the day', () => {
    const now = new Date('2026-10-07T06:30:00Z'); // Wednesday
    const weekly = habit({ freqType: 'WEEKLY', timesPerWeek: 3, reminderDays: 0b1111111, logs: ['2026-10-04', '2026-10-05', '2026-10-06'] });
    const [r] = dueReminders({ tasks: [], habits: [weekly], now, timeZone: TZ });
    expect(r).toMatchObject({ title: 'Time for Stretch', body: '7:30AM · 2 of 3 this week', url: '/habits' });
  });
});
