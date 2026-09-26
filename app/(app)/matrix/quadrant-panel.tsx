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
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${isDropTarget ? color : `color-mix(in oklch, ${color} 28%, var(--border-1))`}`,
        background: `color-mix(in oklch, ${color} ${isDropTarget ? 10 : 5}%, var(--surface-1))`,
        boxShadow: `inset 0 3px 0 0 color-mix(in oklch, ${color} 45%, transparent)${isDropTarget ? `, 0 0 0 3px color-mix(in oklch, ${color} 22%, transparent)` : ''}`,
        transition: 'background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 4px', flex: 'none' }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flex: 'none' }} />
        <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', whiteSpace: 'nowrap' }}>{title}</span>
        <span className="pw-quad-subtitle" style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--fg-3)', marginLeft: 'auto' }}>{tasks.length}</span>
      </div>
      <div className="pw-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '0 16px 12px' }}>
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
