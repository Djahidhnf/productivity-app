import { describe, test, expect } from 'vitest';
import { scheduleForToday, habitsForToday, longDateLabel } from './dashboard-views';
import type { TaskDTO } from '@/app/lib/task-dto';
import type { HabitDTO } from '@/app/lib/habit-dto';

const TODAY = '2026-09-26';

function task(id: string, overrides: Partial<TaskDTO> = {}): TaskDTO {
  return { id, text: id, listId: 'l', priority: null, due: TODAY, dueTime: null, duration: 60, done: false, completedAt: null, reminderOffset: null, order: 0, ...overrides };
}

function habit(id: string, startDate: string): HabitDTO {
  return { id, name: id, color: 'moss', freqType: 'DAILY', timesPerWeek: null, startDate, time: null, reminderOffset: null, reminderDays: null, order: 0, logs: [] };
}

describe('scheduleForToday', () => {
  test("lists only today's timed tasks, done included, in time order", () => {
    const tasks = [
      task('untimed'),
      task('tomorrow', { due: '2026-09-27', dueTime: 30 }),
      task('pm', { dueTime: 900 }),
      task('am', { dueTime: 480, done: true }),
    ];
    expect(scheduleForToday(tasks, TODAY).map((t) => t.id)).toEqual(['am', 'pm']);
  });
});

describe('habitsForToday', () => {
  test('drops habits that start after today', () => {
    expect(habitsForToday([habit('a', '2026-09-01'), habit('b', '2026-09-27'), habit('c', TODAY)], TODAY).map((h) => h.id)).toEqual(['a', 'c']);
  });
});

test('longDateLabel', () => {
  expect(longDateLabel(TODAY)).toBe('Saturday, September 26');
});
