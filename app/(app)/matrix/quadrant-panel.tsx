'use client';

import type { DragEvent, TouchEvent } from 'react';
import { PRIORITY_COLORS, PRIORITY_ON_COLORS, type PriorityKey } from '@/app/components/ui/priority-flag';
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
}

export function QuadrantPanel({
  priorityKey,
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
}: QuadrantPanelProps) {
  const { title, subtitle } = QUADRANT_INFO[priorityKey];
  const color = PRIORITY_COLORS[priorityKey];
  const onColor = PRIORITY_ON_COLORS[priorityKey];

  return (
    <div
      data-quad={priorityKey}
      data-drop-target={isDropTarget || undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${isDropTarget ? color : `color-mix(in oklch, ${color} 35%, var(--border-1))`}`,
        background: isDropTarget ? `color-mix(in oklch, ${color} 8%, var(--surface-1))` : 'var(--surface-1)',
        boxShadow: isDropTarget ? `0 0 0 3px color-mix(in oklch, ${color} 25%, transparent)` : undefined,
        transition: 'background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
      }}
    >
      <div
        data-quad-header
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', flex: 'none', background: color, color: onColor }}
      >
        <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', whiteSpace: 'nowrap' }}>{title}</span>
        <span className="pw-quad-subtitle" style={{ fontSize: 'var(--text-sm)', opacity: 0.85, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>
        <span
          style={{
            marginLeft: 'auto',
            minWidth: 22,
            padding: '1px 7px',
            borderRadius: 999,
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            background: `color-mix(in oklch, ${onColor} 20%, transparent)`,
          }}
        >
          {tasks.length}
        </span>
      </div>
      <div className="pw-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '8px 16px 12px' }}>
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
            onTouchStart={(event) => onTaskTouchStart(task, event)}
            onTouchMove={onTaskTouchMove}
            onTouchEnd={onTaskTouchEnd}
            isTouchDragging={touchDragTaskId === task.id}
          />
        ))}
        {tasks.length === 0 && <p className="st-empty" style={{ margin: '8px 0 0' }}>Nothing here.</p>}
      </div>
    </div>
  );
}
