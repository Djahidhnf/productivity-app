'use client';

import type { DragEvent, TouchEvent } from 'react';
import { PRIORITY_COLORS, type PriorityKey } from '@/app/components/ui/priority-flag';
import { MatrixTaskRow } from './matrix-task-row';
import type { TaskDTO } from './queries';

export const QUADRANT_INFO: Record<PriorityKey, { title: string; subtitle: string }> = {
  RED: { title: 'Do first', subtitle: 'Urgent & important' },
  AMBER: { title: 'Schedule', subtitle: 'Not urgent but important' },
  BLUE: { title: 'Delegate', subtitle: 'Urgent but unimportant' },
  GREEN: { title: 'Eliminate', subtitle: 'Not urgent & unimportant' },
};

export interface QuadrantPanelProps {
  priorityKey: PriorityKey;
  tasks: TaskDTO[];
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onTaskTouchStart: (task: TaskDTO, event: TouchEvent) => void;
  onTaskTouchMove: (event: TouchEvent) => void;
  onTaskTouchEnd: (event: TouchEvent) => void;
  touchDragTaskId: string | null;
}

export function QuadrantPanel({
  priorityKey,
  tasks,
  onToggleDone,
  onOpen,
  onTaskDragStart,
  onDragOver,
  onDrop,
  onTaskTouchStart,
  onTaskTouchMove,
  onTaskTouchEnd,
  touchDragTaskId,
}: QuadrantPanelProps) {
  const { title, subtitle } = QUADRANT_INFO[priorityKey];
  const color = PRIORITY_COLORS[priorityKey];

  return (
    <div
      data-quad={priorityKey}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        borderRadius: 'var(--radius-lg)',
        border: `1px solid color-mix(in srgb, ${color} 30%, var(--border))`,
        background: `color-mix(in srgb, ${color} 5%, var(--surface))`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 'var(--space-4) var(--space-4) var(--space-3)', flex: 'none' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{title}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>{tasks.length}</span>
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginLeft: 'auto' }}>{subtitle}</span>
      </div>
      <div className="pw-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '0 var(--space-4) var(--space-4)' }}>
        {tasks.map((task) => (
          <MatrixTaskRow
            key={task.id}
            task={task}
            onToggleDone={onToggleDone}
            onOpen={onOpen}
            onDragStart={() => onTaskDragStart(task)}
            onTouchStart={(event) => onTaskTouchStart(task, event)}
            onTouchMove={onTaskTouchMove}
            onTouchEnd={onTaskTouchEnd}
            isTouchDragging={touchDragTaskId === task.id}
          />
        ))}
        {tasks.length === 0 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', padding: '6px 2px', margin: 0 }}>Nothing here.</p>}
      </div>
    </div>
  );
}
