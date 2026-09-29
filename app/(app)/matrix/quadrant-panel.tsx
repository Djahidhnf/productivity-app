'use client';

import type { DragEvent } from 'react';
import { PRIORITY_COLORS, type PriorityKey } from '@/app/components/ui/priority-flag';
import { MatrixTaskRow, type MatrixRowTouchProps } from './matrix-task-row';
import type { TaskDTO } from './queries';

export const QUADRANT_INFO: Record<PriorityKey, { numeral: string; title: string; subtitle: string }> = {
  RED: { numeral: 'I', title: 'Do first', subtitle: 'Urgent & important' },
  AMBER: { numeral: 'II', title: 'Schedule', subtitle: 'Not urgent but important' },
  BLUE: { numeral: 'III', title: 'Delegate', subtitle: 'Urgent but unimportant' },
  GREEN: { numeral: 'IV', title: 'Eliminate', subtitle: 'Not urgent & unimportant' },
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
  touch?: MatrixRowTouchProps;
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
  touch,
  isDropTarget = false,
}: QuadrantPanelProps) {
  const { numeral, title, subtitle } = QUADRANT_INFO[priorityKey];
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
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-1)',
        background: isDropTarget ? `color-mix(in oklch, ${color} 6%, var(--surface-1))` : 'var(--surface-1)',
        boxShadow: isDropTarget ? `0 0 0 3px color-mix(in oklch, ${color} 20%, transparent)` : undefined,
        transition: 'background var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
      }}
    >
      <div
        data-quad-header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px 8px',
          flex: 'none',
          borderBottom: '1px solid var(--border-1)',
        }}
      >
        <span
          aria-hidden="true"
          className="pw-quad-numeral"
          style={{ color: `color-mix(in oklch, ${color} 70%, var(--fg-2))`, background: `color-mix(in oklch, ${color} 10%, transparent)` }}
        >
          {numeral}
        </span>
        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--fg-1)', whiteSpace: 'nowrap' }}>{title}</span>
        <span className="pw-quad-subtitle" style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--fg-3)' }}>
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
            onDragStart={(event) => {
              // A long touch press drags through the touch gesture, not a native drag.
              if (touch?.isPressing()) event.preventDefault();
              else onTaskDragStart(task);
            }}
            onDragOver={onTaskDragOver && ((event) => onTaskDragOver(task, event))}
            onDrop={onTaskDrop && ((event) => onTaskDrop(task, event))}
            dropBefore={dropBeforeId === task.id}
            onTouchStart={touch && ((event) => touch.onTaskTouchStart(task, event))}
            onContextMenu={touch && ((event) => touch.isPressing() && event.preventDefault())}
            lifted={touch?.dragTaskId === task.id}
          />
        ))}
        {tasks.length === 0 && <p className="st-empty" style={{ margin: '8px 0 0' }}>Nothing here.</p>}
      </div>
    </div>
  );
}
