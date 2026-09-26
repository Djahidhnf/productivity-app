'use client';

import { useState, type DragEvent, type TouchEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { Icon } from '@/app/components/icons';
import { PRIORITY_COLORS, type PriorityKey } from '@/app/components/ui/priority-flag';
import { formatDueLabel } from '@/app/lib/date-format';
import type { TaskDTO } from './queries';

const FLAG_OPTIONS: { key: PriorityKey; label: string }[] = [
  { key: 'RED', label: 'Do first' },
  { key: 'AMBER', label: 'Schedule' },
  { key: 'BLUE', label: 'Delegate' },
  { key: 'GREEN', label: 'Eliminate' },
];

export interface MatrixTaskRowProps {
  task: TaskDTO;
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  onDragStart: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: (event: TouchEvent) => void;
  isTouchDragging?: boolean;
  /** Shows the insertion line above this row while a dragged task hovers it. */
  dropBefore?: boolean;
  /** When set, a flag button lets the user pick a quadrant for the task. */
  onSetPriority?: (priority: PriorityKey) => void;
}

export function MatrixTaskRow({
  task,
  onToggleDone,
  onOpen,
  onDragStart,
  onDragOver,
  onDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isTouchDragging,
  dropBefore,
  onSetPriority,
}: MatrixTaskRowProps) {
  const dueLabel = formatDueLabel(task.due, task.dueTime);
  const [flagMenuOpen, setFlagMenuOpen] = useState(false);

  return (
    <div
      data-task-id={task.id}
      data-drop-before={dropBefore || undefined}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={() => onOpen(task)}
      className="st-row"
      data-done={task.done || undefined}
      style={{
        flex: 'none',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 0,
        minHeight: 38,
        justifyContent: 'center',
        background: isTouchDragging ? 'var(--surface-hover)' : undefined,
        opacity: isTouchDragging ? 0.6 : 1,
        // Only the row actively being long-press-dragged suppresses native
        // touch scrolling — every other row keeps normal vertical scroll,
        // since touch-action:none on every row would break scrolling within
        // a quadrant's own task list.
        touchAction: isTouchDragging ? 'none' : 'pan-y',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 38 }}>
        <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} shape="round" size="sm" />
        <span className="st-row-text" style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
          {task.text}
        </span>
        {dueLabel && <span className="st-due">{dueLabel}</span>}
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
