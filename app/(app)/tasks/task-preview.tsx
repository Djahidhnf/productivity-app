'use client';

import { PriorityFlag } from '@/app/components/ui/priority-flag';
import { QUADRANT_INFO } from '../matrix/quadrant-panel';
import { formatDueLabel } from '@/app/lib/date-format';
import type { TaskPreviewState } from './use-touch-task-drag';

/** Space kept above a card before the preview flips below it. */
const ROOM_ABOVE_PX = 200;

export interface TaskPreviewProps extends TaskPreviewState {
  onClose: () => void;
}

/** The long-press peek at a task: its full text and details, next to the pressed card. */
export function TaskPreview({ task, listName, anchor, onClose }: TaskPreviewProps) {
  const dueLabel = formatDueLabel(task.due, task.dueTime);
  const placement = anchor.top > ROOM_ABOVE_PX ? { bottom: `calc(100dvh - ${anchor.top - 8}px)` } : { top: anchor.bottom + 8 };

  return (
    <div className="pw-taskpeek-backdrop" onClick={onClose}>
      <div role="dialog" aria-label="Task preview" className="pw-taskpeek" style={placement}>
        <p className="pw-taskpeek-text">{task.text}</p>
        <div className="pw-taskpeek-meta">
          <span>{listName}</span>
          {task.priority && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PriorityFlag priority={task.priority} />
              {QUADRANT_INFO[task.priority].title}
            </span>
          )}
          {dueLabel && <span className="pw-taskpeek-due">{dueLabel}</span>}
        </div>
      </div>
    </div>
  );
}
