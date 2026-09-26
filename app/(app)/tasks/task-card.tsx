'use client';

import type { DragEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { PriorityFlag } from '@/app/components/ui/priority-flag';
import { formatDueLabel, todayKey } from '@/app/lib/date-format';
import type { TaskDTO } from './queries';

export interface TaskCardProps {
  task: TaskDTO;
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
}

export function TaskCard({ task, onToggleDone, onOpen, draggable, onDragStart, onDragOver, onDrop }: TaskCardProps) {
  const dueLabel = formatDueLabel(task.due, task.dueTime);
  const overdue = !task.done && !!task.due && task.due < todayKey();

  return (
    <div
      className="st-row"
      data-done={task.done || undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onOpen(task)}
      style={{ flex: 'none' }}
    >
      <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} shape="round" size="sm" />
      <span className="st-row-text" style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
        {task.text}
      </span>
      {task.priority && <PriorityFlag priority={task.priority} />}
      {dueLabel && (
        <span className="st-due" data-overdue={overdue || undefined}>
          {dueLabel}
        </span>
      )}
    </div>
  );
}
