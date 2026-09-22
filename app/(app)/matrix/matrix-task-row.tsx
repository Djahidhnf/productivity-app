'use client';

import type { DragEvent, TouchEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { formatDueLabel } from '@/app/lib/date-format';
import type { TaskDTO } from './queries';

export interface MatrixTaskRowProps {
  task: TaskDTO;
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  onDragStart: (event: DragEvent) => void;
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: (event: TouchEvent) => void;
  isTouchDragging?: boolean;
}

export function MatrixTaskRow({
  task,
  onToggleDone,
  onOpen,
  onDragStart,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isTouchDragging,
}: MatrixTaskRowProps) {
  const dueLabel = formatDueLabel(task.due, task.dueTime);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={() => onOpen(task)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        background: isTouchDragging ? 'var(--surface-3)' : 'var(--surface)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        opacity: isTouchDragging ? 0.6 : 1,
        // Only the row actively being long-press-dragged suppresses native
        // touch scrolling — every other row keeps normal vertical scroll,
        // since touch-action:none on every row would break scrolling within
        // a quadrant's own task list.
        touchAction: isTouchDragging ? 'none' : 'pan-y',
      }}
    >
      <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} />
      <span
        style={{
          fontSize: 'var(--text-sm)',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textDecoration: task.done ? 'line-through' : 'none',
          color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
        }}
      >
        {task.text}
      </span>
      {dueLabel && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', flex: 'none', whiteSpace: 'nowrap' }}>
          {dueLabel}
        </span>
      )}
    </div>
  );
}
