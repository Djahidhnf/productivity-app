import { describe, test, expect } from 'vitest';
import { tasksForToday, scheduleForToday, habitsForToday, longDateLabel } from './dashboard-views';
import type { TaskDTO } from '@/app/lib/task-dto';
import type { HabitDTO } from '@/app/lib/habit-dto';

const TODAY = '2026-09-26';

function task(id: string, overrides: Partial<TaskDTO> = {}): TaskDTO {
  return { id, text: id, listId: 'l', priority: null, due: TODAY, dueTime: null, duration: 60, done: false, order: 0, ...overrides };
}

function habit(id: string, startDate: string): HabitDTO {
  return { id, name: id, color: 'moss', freqType: 'DAILY', timesPerWeek: null, startDate, order: 0, logs: [] };
}

describe('tasksForToday', () => {
  test('keeps open tasks due today or earlier, highest priority first', () => {
    const tasks = [
      task('none'),
      task('future', { due: '2026-09-27', priority: 'RED' }),
      task('undated', { due: null, priority: 'RED' }),
      task('overdue-green', { due: '2026-09-20', priority: 'GREEN' }),
      task('red', { priority: 'RED' }),
      task('done', { done: true, priority: 'RED' }),
    ];
    expect(tasksForToday(tasks, TODAY).map((t) => t.id)).toEqual(['red', 'overdue-green', 'none']);
  });

  test('same priority sorts by date, then time (untimed last), then order', () => {
    const tasks = [
      task('untimed', { order: 0 }),
      task('late', { dueTime: 600 }),
      task('early', { dueTime: 60 }),
      task('older', { due: '2026-09-25', order: 5 }),
    ];
    expect(tasksForToday(tasks, TODAY).map((t) => t.id)).toEqual(['older', 'early', 'late', 'untimed']);
  });

  test('keeps done tasks listed in keepIds', () => {
    const tasks = [task('a', { done: true }), task('b', { done: true })];
    expect(tasksForToday(tasks, TODAY, new Set(['b'])).map((t) => t.id)).toEqual(['b']);
  });
});

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
