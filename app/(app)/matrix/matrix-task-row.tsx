'use client';

import { useState, type DragEvent, type MouseEvent, type TouchEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { Icon } from '@/app/components/icons';
import { PRIORITY_COLORS, type PriorityKey } from '@/app/components/ui/priority-flag';
import { formatDueLabel, todayKey } from '@/app/lib/date-format';
import type { TaskDTO } from './queries';

const FLAG_OPTIONS: { key: PriorityKey; label: string }[] = [
  { key: 'RED', label: 'Do first' },
  { key: 'AMBER', label: 'Schedule' },
  { key: 'BLUE', label: 'Delegate' },
  { key: 'GREEN', label: 'Eliminate' },
];

/** Phone long-press gestures (preview + drag), when the board provides them. */
export interface MatrixRowTouchProps {
  onTaskTouchStart: (task: TaskDTO, event: TouchEvent<HTMLElement>) => void;
  /** True while a finger holds a row: native drags and context menus are suppressed. */
  isPressing: () => boolean;
  dragTaskId: string | null;
}

export interface MatrixTaskRowProps {
  task: TaskDTO;
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  /** False keeps the row in place: no mouse drag (a long press still previews it). */
  draggable?: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
  onTouchStart?: (event: TouchEvent<HTMLElement>) => void;
  onContextMenu?: (event: MouseEvent) => void;
  /** Dimmed while it is being touch-dragged. */
  lifted?: boolean;
  /** Shows the insertion line above this row while a dragged task hovers it. */
  dropBefore?: boolean;
  /** When set, a flag button lets the user pick a quadrant for the task. */
  onSetPriority?: (priority: PriorityKey) => void;
}

export function MatrixTaskRow({
  task,
  onToggleDone,
  onOpen,
  draggable = true,
  onDragStart,
  onDragOver,
  onDrop,
  onTouchStart,
  onContextMenu,
  lifted,
  dropBefore,
  onSetPriority,
}: MatrixTaskRowProps) {
  const dueLabel = formatDueLabel(task.due, task.dueTime);
  const overdue = !task.done && !!task.due && task.due < todayKey();
  const [flagMenuOpen, setFlagMenuOpen] = useState(false);

  return (
    <div
      data-task-id={task.id}
      data-drop-before={dropBefore || undefined}
      data-lifted={lifted || undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onTouchStart={onTouchStart}
      onContextMenu={onContextMenu}
      onClick={() => onOpen(task)}
      className="st-row pw-mrow"
      data-done={task.done || undefined}
      style={{
        flex: 'none',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 0,
        minHeight: 38,
        justifyContent: 'center',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 38 }}>
        <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} shape="round" size="sm" />
        <span className="pw-mrow-body">
          <span className="st-row-text" style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
            {task.text}
          </span>
          {dueLabel && (
            <span className="pw-mrow-due" data-overdue={overdue || undefined}>
              {dueLabel}
            </span>
          )}
        </span>
        {onSetPriority && (
          <button
            type="button"
            aria-label="Set priority"
            aria-expanded={flagMenuOpen}
            className="pw-flagbtn"
            onClick={(event) => {
              event.stopPropagation();
              setFlagMenuOpen((open) => !open);
            }}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <Icon name="flag" size={15} />
          </button>
        )}
      </div>
      {onSetPriority && flagMenuOpen && (
        <div
          role="group"
          aria-label="Choose a quadrant"
          className="pw-flagmenu"
          onClick={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        >
          {FLAG_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setFlagMenuOpen(false);
                onSetPriority(opt.key);
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: PRIORITY_COLORS[opt.key], flex: 'none' }} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
