import { describe, test, expect } from 'vitest';
import { groupTasksByPriority } from './matrix-groups';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

describe('groupTasksByPriority', () => {
  test('groups tasks into their priority bucket', () => {
    const tasks = [
      makeTask({ id: 't1', priority: 'RED' }),
      makeTask({ id: 't2', priority: 'AMBER' }),
      makeTask({ id: 't3', priority: 'BLUE' }),
      makeTask({ id: 't4', priority: 'GREEN' }),
      makeTask({ id: 't5', priority: null }),
    ];
    const groups = groupTasksByPriority(tasks);
    expect(groups.RED.map((t) => t.id)).toEqual(['t1']);
    expect(groups.AMBER.map((t) => t.id)).toEqual(['t2']);
    expect(groups.BLUE.map((t) => t.id)).toEqual(['t3']);
    expect(groups.GREEN.map((t) => t.id)).toEqual(['t4']);
    expect(groups.unflagged.map((t) => t.id)).toEqual(['t5']);
  });

  test('preserves the input order within each group', () => {
    const tasks = [
      makeTask({ id: 't1', priority: 'RED' }),
      makeTask({ id: 't2', priority: 'RED' }),
      makeTask({ id: 't3', priority: 'RED' }),
    ];
    const groups = groupTasksByPriority(tasks);
    expect(groups.RED.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
  });

  test('returns empty arrays for every group when given no tasks', () => {
    const groups = groupTasksByPriority([]);
    expect(groups).toEqual({ RED: [], AMBER: [], BLUE: [], GREEN: [], unflagged: [] });
  });
});
