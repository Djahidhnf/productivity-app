import { describe, test, expect } from 'vitest';
import { indexTasksByDate, buildMonthWeeks } from './calendar-views';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: null,
    due: '2026-09-10',
    dueTime: null,
    duration: 60,
    done: false,
    completedAt: null,
    reminderOffset: null,
    order: 0,
    ...overrides,
  };
}

describe('indexTasksByDate', () => {
  test('groups tasks by due date and skips tasks without one', () => {
    const index = indexTasksByDate([
      makeTask({ id: 'a', due: '2026-09-10' }),
      makeTask({ id: 'b', due: '2026-09-10' }),
      makeTask({ id: 'c', due: '2026-09-11' }),
      makeTask({ id: 'd', due: null }),
    ]);
    expect(index.get('2026-09-10')?.map((t) => t.id)).toEqual(['a', 'b']);
    expect(index.get('2026-09-11')?.map((t) => t.id)).toEqual(['c']);
    expect(index.size).toBe(2);
  });
});

describe('buildMonthWeeks', () => {
  test('September 2026 (starts on a Tuesday, 30 days) has 5 rows of 7 slots', () => {
    const weeks = buildMonthWeeks(new Map(), 2026, 8);
    expect(weeks).toHaveLength(5);
    for (const week of weeks) expect(week).toHaveLength(7);
  });

  test('slots outside the month are null and days inside are real cells', () => {
    const weeks = buildMonthWeeks(new Map(), 2026, 8);
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toBeNull();
    expect(weeks[0][2]?.dateKey).toBe('2026-09-01');
    expect(weeks[4][3]?.dateKey).toBe('2026-09-30');
    expect(weeks[4][4]).toBeNull();
    expect(weeks.flat().filter((c) => c !== null)).toHaveLength(30);
  });

  test('February 2026 starts on a Sunday and fits exactly 4 full rows', () => {
    const weeks = buildMonthWeeks(new Map(), 2026, 1);
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((c) => c !== null)).toBe(true);
  });

  test('August 2026 (starts on a Saturday, 31 days) needs 6 rows', () => {
    expect(buildMonthWeeks(new Map(), 2026, 7)).toHaveLength(6);
  });

  test('a cell shows up to 3 chips and counts the rest in moreCount', () => {
    const tasks = Array.from({ length: 5 }, (_, i) => makeTask({ id: `t${i}` }));
    const weeks = buildMonthWeeks(indexTasksByDate(tasks), 2026, 8);
    const cell = weeks.flat().find((c) => c?.dateKey === '2026-09-10');
    expect(cell?.chips).toHaveLength(3);
    expect(cell?.moreCount).toBe(2);
  });

  test('days without tasks have no chips', () => {
    const weeks = buildMonthWeeks(new Map(), 2026, 8);
    const cell = weeks.flat().find((c) => c?.dateKey === '2026-09-12');
    expect(cell?.chips).toEqual([]);
    expect(cell?.moreCount).toBe(0);
  });
});
