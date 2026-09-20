'use client';

import type { DragEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { PriorityFlag, PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import type { TaskDTO } from './queries';

function formatDueLabel(due: string | null, dueTime: number | null): string | null {
  if (!due) return null;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  let label = due === today ? 'Today' : due === tomorrow ? 'Tomorrow' : due.slice(5);
  if (dueTime != null) {
    const hours = Math.floor(dueTime / 60);
    const minutes = dueTime % 60;
    const period = hours < 12 ? 'AM' : 'PM';
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    label += ` ${hours12}:${String(minutes).padStart(2, '0')}${period}`;
  }
  return label;
}

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
  const accentColor = task.priority ? PRIORITY_COLORS[task.priority] : 'transparent';

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onOpen(task)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 10,
        borderRadius: 'var(--radius-md)',
        background: task.priority
          ? `color-mix(in srgb, ${PRIORITY_COLORS[task.priority]} 8%, var(--surface))`
          : 'var(--surface-2)',
        borderLeft: `3px solid ${accentColor}`,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} />
        <span
          style={{
            fontSize: 'var(--text-sm)',
            flex: 1,
            textDecoration: task.done ? 'line-through' : 'none',
            color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
          }}
        >
          {task.text}
        </span>
        {task.priority && <PriorityFlag priority={task.priority} />}
      </div>
      {dueLabel && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
          {dueLabel}
        </span>
      )}
    </div>
  );
}
