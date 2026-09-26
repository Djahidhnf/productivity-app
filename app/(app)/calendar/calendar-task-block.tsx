'use client';

import { CheckToggle } from '@/app/components/ui/check-toggle';
import { PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import { HOUR_PX } from './calendar-views';
import { formatTime } from '@/app/lib/date-format';
import type { TaskDTO } from './queries';

export interface CalendarTaskBlockProps {
  task: TaskDTO;
  onOpen: (task: TaskDTO) => void;
  onToggleDone?: (taskId: string) => void;
  draggable?: boolean;
  onDragStart?: () => void;
}

export function CalendarTaskBlock({ task, onOpen, onToggleDone, draggable, onDragStart }: CalendarTaskBlockProps) {
  const top = ((task.dueTime ?? 0) / 60) * HOUR_PX;
  const height = Math.max(20, (task.duration / 60) * HOUR_PX);
  const color = task.priority ? PRIORITY_COLORS[task.priority] : null;
  const start = task.dueTime ?? 0;
  const tall = height >= 40;

  return (
    <div
      className="pw-cal-block"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(task);
      }}
      title={`${task.text} · ${formatTime(start)}–${formatTime(start + task.duration)}`}
      style={{
        position: 'absolute',
        top: top + 1,
        left: 2,
        right: 2,
        height: height - 2,
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: 6,
        border: `1px solid ${color ? `color-mix(in oklch, ${color} 40%, var(--border-2))` : 'var(--border-2)'}`,
        background: color ? `color-mix(in oklch, ${color} 10%, var(--surface-1))` : 'var(--surface-1)',
        opacity: task.done ? 0.6 : 1,
        padding: '3px 6px',
        cursor: 'pointer',
        fontSize: 'var(--text-xs)',
        display: 'flex',
        flexDirection: tall ? 'column' : 'row',
        alignItems: tall ? 'stretch' : 'center',
        gap: tall ? 0 : 6,
        zIndex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {onToggleDone && (
          <span className="pw-cal-block-check" style={{ display: 'flex' }}>
            <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} shape="round" size="sm" />
          </span>
        )}
        <span
          style={{
            fontWeight: 500,
            lineHeight: 1.3,
            textDecoration: task.done ? 'line-through' : 'none',
            color: 'var(--fg-1)',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {task.text}
        </span>
      </div>
      {tall && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>
          {formatTime(start)}–{formatTime(start + task.duration)}
        </span>
      )}
    </div>
  );
}
