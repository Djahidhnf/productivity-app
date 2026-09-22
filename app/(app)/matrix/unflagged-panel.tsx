'use client';

import type { DragEvent, TouchEvent } from 'react';
import { MatrixTaskRow } from './matrix-task-row';
import type { TaskDTO } from './queries';

export interface UnflaggedPanelProps {
  tasks: TaskDTO[];
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onTaskTouchStart: (task: TaskDTO, event: TouchEvent) => void;
  onTaskTouchMove: (event: TouchEvent) => void;
  onTaskTouchEnd: (event: TouchEvent) => void;
  touchDragTaskId: string | null;
  isDropTarget?: boolean;
}

export function UnflaggedPanel({
  tasks,
  onToggleDone,
  onOpen,
  onTaskDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onTaskTouchStart,
  onTaskTouchMove,
  onTaskTouchEnd,
  touchDragTaskId,
  isDropTarget = false,
}: UnflaggedPanelProps) {
  return (
    <aside
      data-quad="none"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="pw-matrix-right pw-scroll"
      style={{
        flex: 35,
        minWidth: 0,
        overflow: 'auto',
        padding: '0 clamp(16px, 3vw, 32px) 24px var(--space-4)',
        borderLeft: isDropTarget ? '2px solid var(--accent)' : '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Unflagged
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>{tasks.length}</span>
      </div>
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
      {tasks.length === 0 && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', margin: '2px 0' }}>Everything is flagged.</p>
      )}
    </aside>
  );
}
