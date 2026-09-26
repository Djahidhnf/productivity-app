import { describe, test, expect } from 'vitest';
import { moveTaskInLists, taskIdsForList, moveListInLists, moveListToIndex } from './task-reorder';
import type { TaskListDTO } from './queries';

function makeTask(id: string, listId: string, order: number) {
  return { id, text: id, listId, priority: null, due: null, dueTime: null, duration: 60, done: false, order };
}

function makeLists(): TaskListDTO[] {
  return [
    { id: 'listA', name: 'A', order: 0, tasks: [makeTask('t1', 'listA', 0), makeTask('t2', 'listA', 1)] },
    { id: 'listB', name: 'B', order: 1, tasks: [makeTask('t3', 'listB', 0)] },
  ];
}

describe('moveTaskInLists', () => {
  test('reorders within the same list, inserting before the target task', () => {
    const result = moveTaskInLists(makeLists(), 't2', 'listA', 't1');
    expect(taskIdsForList(result, 'listA')).toEqual(['t2', 't1']);
    expect(taskIdsForList(result, 'listB')).toEqual(['t3']);
  });

  test('appends to the end when targetTaskId is null', () => {
    const result = moveTaskInLists(makeLists(), 't1', 'listA', null);
    expect(taskIdsForList(result, 'listA')).toEqual(['t2', 't1']);
  });

  test('moves a task into a different list, updating its listId', () => {
    const result = moveTaskInLists(makeLists(), 't1', 'listB', 't3');
    expect(taskIdsForList(result, 'listA')).toEqual(['t2']);
    expect(taskIdsForList(result, 'listB')).toEqual(['t1', 't3']);
    const movedTask = result.find((l) => l.id === 'listB')!.tasks.find((t) => t.id === 't1')!;
    expect(movedTask.listId).toBe('listB');
  });

  test('appends to the end of a different list when targetTaskId is null', () => {
    const result = moveTaskInLists(makeLists(), 't1', 'listB', null);
    expect(taskIdsForList(result, 'listB')).toEqual(['t3', 't1']);
  });

  test('returns the lists unchanged if the dragged task id does not exist anywhere', () => {
    const lists = makeLists();
    const result = moveTaskInLists(lists, 'nonexistent', 'listA', null);
    expect(result).toBe(lists);
  });

  test('is a no-op when dropping a task back onto itself', () => {
    const lists = makeLists();
    const result = moveTaskInLists(lists, 't1', 'listA', 't1');
    expect(result).toBe(lists);
  });
});

describe('moveListInLists', () => {
  test('moves a list before the target list', () => {
    const lists = makeLists();
    const result = moveListInLists(lists, 'listB', 'listA');
    expect(result.map((l) => l.id)).toEqual(['listB', 'listA']);
  });

  test('is a no-op when dragging a list onto itself', () => {
    const lists = makeLists();
    const result = moveListInLists(lists, 'listA', 'listA');
    expect(result).toBe(lists);
  });
});

describe('moveListToIndex', () => {
  test('moves a list to the given final index', () => {
    expect(moveListToIndex(makeLists(), 'listA', 1).map((l) => l.id)).toEqual(['listB', 'listA']);
    expect(moveListToIndex(makeLists(), 'listB', 0).map((l) => l.id)).toEqual(['listB', 'listA']);
  });
  test('returns the same array for a no-op or unknown list, and clamps the index', () => {
    const lists = makeLists();
    expect(moveListToIndex(lists, 'listA', 0)).toBe(lists);
    expect(moveListToIndex(lists, 'nope', 1)).toBe(lists);
    expect(moveListToIndex(lists, 'listA', 99).map((l) => l.id)).toEqual(['listB', 'listA']);
  });
});
