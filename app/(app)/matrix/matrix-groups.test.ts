import { describe, test, expect } from 'vitest';
import { groupTasksByPriority } from './matrix-groups';
import { placeTask, groupTaskIds } from './matrix-groups';
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
    completedAt: null,
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

describe('placeTask / groupTaskIds', () => {
  const t = (id: string, priority: TaskDTO['priority'] = null): TaskDTO => ({
    id, text: id, listId: 'l', priority, due: null, dueTime: null, duration: 60, done: false, completedAt: null, order: 0,
  });
  const base = [t('r1', 'RED'), t('u1'), t('r2', 'RED'), t('u2')];

  test('moves a task before another within its group', () => {
    expect(groupTaskIds(placeTask(base, 'r2', 'RED', 'r1'), 'RED')).toEqual(['r2', 'r1']);
  });
  test('moves a task into another group before a given task, updating its priority', () => {
    const next = placeTask(base, 'u2', 'RED', 'r2');
    expect(groupTaskIds(next, 'RED')).toEqual(['r1', 'u2', 'r2']);
    expect(next.find((x) => x.id === 'u2')?.priority).toBe('RED');
    expect(groupTaskIds(next, null)).toEqual(['u1']);
  });
  test('a null target appends to the end of the group (or the array when the group is empty)', () => {
    expect(groupTaskIds(placeTask(base, 'u1', 'RED', null), 'RED')).toEqual(['r1', 'r2', 'u1']);
    expect(groupTaskIds(placeTask(base, 'u1', 'GREEN', null), 'GREEN')).toEqual(['u1']);
  });
  test('dropping a task onto itself is a no-op', () => {
    expect(placeTask(base, 'r1', 'RED', 'r1')).toBe(base);
  });
});
