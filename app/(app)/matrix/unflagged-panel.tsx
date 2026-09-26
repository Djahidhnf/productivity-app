'use client';

import type { DragEvent, TouchEvent } from 'react';
import { MatrixTaskRow } from './matrix-task-row';
import type { PriorityKey } from '@/app/components/ui/priority-flag';
import type { TaskDTO } from './queries';

export interface UnflaggedPanelProps {
  tasks: TaskDTO[];
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onTaskDragOver?: (task: TaskDTO, event: DragEvent) => void;
  onTaskDrop?: (task: TaskDTO, event: DragEvent) => void;
  /** Task the dragged task would be inserted before, when it is in this group. */
  dropBeforeId?: string | null;
  onTaskTouchStart: (task: TaskDTO, event: TouchEvent) => void;
  onTaskTouchMove: (event: TouchEvent) => void;
  onTaskTouchEnd: (event: TouchEvent) => void;
  touchDragTaskId: string | null;
  isDropTarget?: boolean;
  /** Phone only: shows a flag button on each row to move it into a quadrant. */
  onSetPriority?: (task: TaskDTO, priority: PriorityKey) => void;
}

export function UnflaggedPanel({
  tasks,
  onToggleDone,
  onOpen,
  onTaskDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onTaskDragOver,
  onTaskDrop,
  dropBeforeId = null,
  onTaskTouchStart,
  onTaskTouchMove,
  onTaskTouchEnd,
  touchDragTaskId,
  isDropTarget = false,
  onSetPriority,
}: UnflaggedPanelProps) {
  return (
    <aside
      data-quad="none"
      data-drop-target={isDropTarget || undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="pw-matrix-right pw-scroll"
      style={{
        minWidth: 0,
        overflow: 'auto',
        padding: 12,
        margin: -12,
        borderRadius: 'var(--radius-lg)',
        border: `1px dashed ${isDropTarget ? 'var(--accent)' : 'transparent'}`,
        background: isDropTarget ? 'var(--accent-subtle)' : 'transparent',
        transition: 'background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h2 className="st-label" style={{ paddingBottom: 4 }}>
        Unflagged
        <span className="st-label-count">{tasks.length}</span>
      </h2>
      {tasks.map((task) => (
        <MatrixTaskRow
          key={task.id}
          task={task}
          onToggleDone={onToggleDone}
          onOpen={onOpen}
          onDragStart={() => onTaskDragStart(task)}
          onDragOver={onTaskDragOver && ((event) => onTaskDragOver(task, event))}
          onDrop={onTaskDrop && ((event) => onTaskDrop(task, event))}
          dropBefore={dropBeforeId === task.id}
          onSetPriority={onSetPriority ? (priority) => onSetPriority(task, priority) : undefined}
          onTouchStart={(event) => onTaskTouchStart(task, event)}
          onTouchMove={onTaskTouchMove}
          onTouchEnd={onTaskTouchEnd}
          isTouchDragging={touchDragTaskId === task.id}
        />
      ))}
      {tasks.length === 0 && (
        <p className="st-empty" style={{ margin: '8px 0 0' }}>Everything is flagged.</p>
      )}
    </aside>
  );
}
