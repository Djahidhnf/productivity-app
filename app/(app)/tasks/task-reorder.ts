import type { TaskListDTO } from './queries';

/**
 * Moves a task to a new position, optionally into a different list.
 * targetTaskId null means "append to the end of targetListId".
 */
export function moveTaskInLists(
  lists: TaskListDTO[],
  draggedTaskId: string,
  targetListId: string,
  targetTaskId: string | null
): TaskListDTO[] {
  if (draggedTaskId === targetTaskId) return lists;
  const sourceList = lists.find((l) => l.tasks.some((t) => t.id === draggedTaskId));
  if (!sourceList) return lists;
  const draggedTask = sourceList.tasks.find((t) => t.id === draggedTaskId)!;

  const withoutDragged = lists.map((list) => ({
    ...list,
    tasks: list.tasks.filter((t) => t.id !== draggedTaskId),
  }));

  return withoutDragged.map((list) => {
    if (list.id !== targetListId) return list;
    const insertIndex = targetTaskId ? list.tasks.findIndex((t) => t.id === targetTaskId) : -1;
    const at = insertIndex === -1 ? list.tasks.length : insertIndex;
    const newTasks = [...list.tasks];
    newTasks.splice(at, 0, { ...draggedTask, listId: targetListId });
    return { ...list, tasks: newTasks };
  });
}

/** Returns the ordered task IDs for a single list, ready to send to reorderTasks(). */
export function taskIdsForList(lists: TaskListDTO[], listId: string): string[] {
  return lists.find((l) => l.id === listId)?.tasks.map((t) => t.id) ?? [];
}

/** Reorders the TaskList array itself (dragging a column header). */
export function moveListInLists(lists: TaskListDTO[], draggedListId: string, targetListId: string): TaskListDTO[] {
  if (draggedListId === targetListId) return lists;
  const dragged = lists.find((l) => l.id === draggedListId);
  if (!dragged) return lists;
  const without = lists.filter((l) => l.id !== draggedListId);
  const targetIndex = without.findIndex((l) => l.id === targetListId);
  const at = targetIndex === -1 ? without.length : targetIndex;
  const next = [...without];
  next.splice(at, 0, dragged);
  return next;
}
