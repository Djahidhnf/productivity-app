'use client';

import { PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import { HOUR_PX } from './calendar-views';
import type { TaskDTO } from './queries';

export interface CalendarTaskBlockProps {
  task: TaskDTO;
  onOpen: (task: TaskDTO) => void;
  draggable?: boolean;
  onDragStart?: () => void;
}

export function CalendarTaskBlock({ task, onOpen, draggable, onDragStart }: CalendarTaskBlockProps) {
  const top = ((task.dueTime ?? 0) / 60) * HOUR_PX;
  const height = Math.max(20, (task.duration / 60) * HOUR_PX);
  const color = task.priority ? PRIORITY_COLORS[task.priority] : 'var(--text-faint)';

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(task);
      }}
      style={{
        position: 'absolute',
        top,
        left: 2,
        right: 2,
        height,
        overflow: 'hidden',
        borderRadius: 'var(--radius-sm)',
        borderLeft: `3px solid ${color}`,
        background: task.priority ? `color-mix(in srgb, ${color} 12%, var(--surface))` : 'var(--surface-2)',
        padding: '2px 6px',
        cursor: 'pointer',
        fontSize: 'var(--text-xs)',
      }}
    >
      <span
        style={{
          textDecoration: task.done ? 'line-through' : 'none',
          color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
        }}
      >
        {task.text}
      </span>
    </div>
  );
}
