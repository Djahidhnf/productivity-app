import type { TaskDTO } from './queries';

export interface MatrixGroups {
  RED: TaskDTO[];
  AMBER: TaskDTO[];
  BLUE: TaskDTO[];
  GREEN: TaskDTO[];
  unflagged: TaskDTO[];
}

export function groupTasksByPriority(tasks: TaskDTO[]): MatrixGroups {
  const groups: MatrixGroups = { RED: [], AMBER: [], BLUE: [], GREEN: [], unflagged: [] };
  for (const task of tasks) {
    if (task.priority) {
      groups[task.priority].push(task);
    } else {
      groups.unflagged.push(task);
    }
  }
  return groups;
}

export type MatrixGroupKey = NonNullable<TaskDTO['priority']> | 'unflagged';

export function groupKeyOf(priority: TaskDTO['priority']): MatrixGroupKey {
  return priority ?? 'unflagged';
}

/**
 * Moves a task into the group for `priority`, placed just before `beforeTaskId`
 * (or at the end of that group when null). The matrix keeps one flat array;
 * each group's order is its tasks' relative order in it.
 */
export function placeTask(
  tasks: TaskDTO[],
  taskId: string,
  priority: TaskDTO['priority'],
  beforeTaskId: string | null
): TaskDTO[] {
  if (taskId === beforeTaskId) return tasks;
  const moving = tasks.find((t) => t.id === taskId);
  if (!moving) return tasks;
  const rest = tasks.filter((t) => t.id !== taskId);
  const placed = { ...moving, priority };
  let at = beforeTaskId ? rest.findIndex((t) => t.id === beforeTaskId) : -1;
  if (at === -1) {
    // End of the target group: right after its last task, or at the very end.
    const key = groupKeyOf(priority);
    let last = -1;
    rest.forEach((t, i) => {
      if (groupKeyOf(t.priority) === key) last = i;
    });
    at = last === -1 ? rest.length : last + 1;
  }
  return [...rest.slice(0, at), placed, ...rest.slice(at)];
}

/** Ordered task IDs of one matrix group, ready for placeMatrixTask(). */
export function groupTaskIds(tasks: TaskDTO[], priority: TaskDTO['priority']): string[] {
  const key = groupKeyOf(priority);
  return tasks.filter((t) => groupKeyOf(t.priority) === key).map((t) => t.id);
}
