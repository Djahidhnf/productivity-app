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
