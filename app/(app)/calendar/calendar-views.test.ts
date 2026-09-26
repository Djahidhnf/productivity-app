import { describe, test, expect } from 'vitest';
import {
  HOUR_PX,
  tasksByDate,
  timedTasksByDate,
  untimedTasksByDate,
  dayColor,
  buildAgendaGroups,
  minutesFromOffset,
} from './calendar-views';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

describe('tasksByDate / timedTasksByDate / untimedTasksByDate', () => {
  test('tasksByDate returns only tasks due on that exact date', () => {
    const tasks = [makeTask({ id: 't1', due: '2026-09-23' }), makeTask({ id: 't2', due: '2026-09-24' })];
    expect(tasksByDate(tasks, '2026-09-23').map((t) => t.id)).toEqual(['t1']);
  });

  test('timedTasksByDate excludes tasks with no dueTime', () => {
    const tasks = [
      makeTask({ id: 't1', dueTime: 120 }),
      makeTask({ id: 't2', dueTime: null }),
    ];
    expect(timedTasksByDate(tasks, '2026-09-23').map((t) => t.id)).toEqual(['t1']);
  });

  test('untimedTasksByDate returns only tasks with no dueTime', () => {
    const tasks = [
      makeTask({ id: 't1', dueTime: 120 }),
      makeTask({ id: 't2', dueTime: null }),
    ];
    expect(untimedTasksByDate(tasks, '2026-09-23').map((t) => t.id)).toEqual(['t2']);
  });
});

describe('dayColor', () => {
  test('returns the highest-priority color when multiple priorities are present', () => {
    const tasks = [makeTask({ priority: 'BLUE' }), makeTask({ id: 't2', priority: 'RED' })];
    expect(dayColor(tasks)).toBe('var(--clay-500)'); // RED wins over BLUE
  });

  test('returns a neutral gray when tasks exist but none are flagged', () => {
    const tasks = [makeTask({ priority: null })];
    expect(dayColor(tasks)).toBe('var(--accent)');
  });

  test('returns transparent when there are no tasks', () => {
    expect(dayColor([])).toBe('transparent');
  });
});

describe('buildAgendaGroups', () => {
  test('excludes tasks outside the window and omits empty days', () => {
    const tasks = [
      makeTask({ id: 't1', due: '2026-09-23' }),
      makeTask({ id: 't2', due: '2026-12-25' }), // outside a 60-day window from 09-23
    ];
    const groups = buildAgendaGroups(tasks, '2026-09-23', 60);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-09-23']);
  });

  test('sorts timed tasks before untimed within a day, ascending by time', () => {
    const tasks = [
      makeTask({ id: 't1', due: '2026-09-23', dueTime: null }),
      makeTask({ id: 't2', due: '2026-09-23', dueTime: 600 }),
      makeTask({ id: 't3', due: '2026-09-23', dueTime: 120 }),
    ];
    const groups = buildAgendaGroups(tasks, '2026-09-23', 60);
    expect(groups[0].items.map((i) => i.task.id)).toEqual(['t3', 't2', 't1']);
  });

  test('labels an untimed task "All day" and a timed task with its formatted time', () => {
    const tasks = [
      makeTask({ id: 't1', due: '2026-09-23', dueTime: null }),
      makeTask({ id: 't2', due: '2026-09-23', dueTime: 90 }),
    ];
    const groups = buildAgendaGroups(tasks, '2026-09-23', 60);
    const byId = Object.fromEntries(groups[0].items.map((i) => [i.task.id, i.timeLabel]));
    expect(byId.t1).toBe('All day');
    expect(byId.t2).toBe('1:30AM');
  });

  test('sorts days ascending across the window', () => {
    const tasks = [
      makeTask({ id: 't1', due: '2026-09-25' }),
      makeTask({ id: 't2', due: '2026-09-23' }),
    ];
    const groups = buildAgendaGroups(tasks, '2026-09-23', 60);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-09-23', '2026-09-25']);
  });

  test('the window is exactly `days` days long, inclusive of the start day', () => {
    const tasks = [
      makeTask({ id: 'in-range', due: '2026-09-23' }), // day 0 (the start day itself)
      makeTask({ id: 'last-day', due: '2026-11-21' }), // day 59 (60th day of the window)
      makeTask({ id: 'one-too-far', due: '2026-11-22' }), // day 60 (61st day, out of range)
    ];
    const groups = buildAgendaGroups(tasks, '2026-09-23', 60);
    const allIds = groups.flatMap((g) => g.items.map((i) => i.task.id));
    expect(allIds).toContain('in-range');
    expect(allIds).toContain('last-day');
    expect(allIds).not.toContain('one-too-far');
  });
});

describe('minutesFromOffset', () => {
  test('converts a pixel offset to minutes using HOUR_PX', () => {
    expect(minutesFromOffset(HOUR_PX * 2, 30)).toBe(120);
  });

  test('snaps to the given increment', () => {
    expect(minutesFromOffset(HOUR_PX * 2 + 10, 30)).toBe(120); // 130 rounds down to 120
    expect(minutesFromOffset(HOUR_PX * 2 + 25, 30)).toBe(150); // 145 rounds up to 150
  });

  test('clamps to the valid 0..(24h - snap) range', () => {
    expect(minutesFromOffset(-100, 30)).toBe(0);
    expect(minutesFromOffset(HOUR_PX * 30, 30)).toBe(24 * 60 - 30);
  });
});
