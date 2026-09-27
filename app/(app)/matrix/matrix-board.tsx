'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import type { DragEvent, TouchEvent } from 'react';
import type { Priority } from '@prisma/client';
import { QuadrantPanel } from './quadrant-panel';
import { UnflaggedPanel } from './unflagged-panel';
import { groupTasksByPriority, groupKeyOf, groupTaskIds, placeTask, type MatrixGroupKey } from './matrix-groups';
import { TaskDialog, taskToDialogValues, parseDueTime, type TaskDialogValues } from '../tasks/task-dialog';
import { updateTask, deleteTask, toggleTaskDone, placeMatrixTask } from '../tasks/actions';
import { PageHeader } from '@/app/components/shell/page-header';
import { PillToggle } from '@/app/components/ui/pill-toggle';
import { useMediaQuery } from '@/app/lib/use-media-query';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

const LONG_PRESS_MS = 280;
const TOUCH_MOVE_CANCEL_PX = 10;

const QUADRANT_KEYS: Priority[] = ['RED', 'AMBER', 'BLUE', 'GREEN'];

/** Where a dragged task would land: a group, before a task in it (null = at the end). */
interface DropSlot {
  group: MatrixGroupKey;
  beforeId: string | null;
}

function priorityOfGroup(group: MatrixGroupKey): Priority | null {
  return group === 'unflagged' ? null : group;
}

export interface MatrixBoardProps {
  initialTasks: TaskDTO[];
  lists: TaskListDTO[];
}

export function MatrixBoard({ initialTasks, lists }: MatrixBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dropSlot, setDropSlot] = useState<DropSlot | null>(null);
  const [dialog, setDialog] = useState<{ task: TaskDTO; values: TaskDialogValues } | null>(null);
  const isNarrow = useMediaQuery('(max-width: 860px)');
  const [activeTab, setActiveTab] = useState<'matrix' | 'unflagged'>('matrix');
  const [touchDragTaskId, setTouchDragTaskId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const justDraggedRef = useRef(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function clearDragState() {
      setDragTaskId(null);
      setDropSlot(null);
    }
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!touchDragTaskId) return;
    function preventScroll(event: globalThis.TouchEvent) {
      event.preventDefault();
    }
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => document.removeEventListener('touchmove', preventScroll);
  }, [touchDragTaskId]);

  const groups = groupTasksByPriority(tasks);

  /** Moves a task into a group at a position, optimistically, and saves it. */
  function applyPlacement(taskId: string, group: MatrixGroupKey, beforeId: string | null) {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const priority = priorityOfGroup(group);
    const next = placeTask(tasks, taskId, priority, beforeId);
    const orderedTaskIds = groupTaskIds(next, priority);
    const unchanged =
      groupKeyOf(target.priority) === group && orderedTaskIds.join() === groupTaskIds(tasks, priority).join();
    if (unchanged) return;
    const prevTasks = tasks;
    setTasks(next);
    startTransition(async () => {
      try {
        await placeMatrixTask({ taskId, priority, orderedTaskIds });
      } catch {
        setTasks(prevTasks);
        window.alert('Could not update the task. Please try again.');
      }
    });
  }

  /** The drop slot for a pointer over a task row: before it (upper half) or after it (lower half). */
  function slotAtRow(task: TaskDTO, rowEl: Element, clientY: number): DropSlot {
    const group = groupKeyOf(task.priority);
    const rect = rowEl.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return { group, beforeId: task.id };
    const members = groups[group];
    const next = members[members.findIndex((t) => t.id === task.id) + 1];
    return { group, beforeId: next?.id ?? null };
  }

  function handleTaskDragOver(task: TaskDTO, event: DragEvent) {
    if (!dragTaskId) return;
    event.preventDefault();
    event.stopPropagation();
    setDropSlot(slotAtRow(task, event.currentTarget, event.clientY));
  }

  function handleTaskDrop(task: TaskDTO, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (dragTaskId) {
      const slot = slotAtRow(task, event.currentTarget, event.clientY);
      applyPlacement(dragTaskId, slot.group, slot.beforeId);
    }
    setDragTaskId(null);
    setDropSlot(null);
  }

  function handleDrop(group: MatrixGroupKey) {
    if (dragTaskId) applyPlacement(dragTaskId, group, null);
    setDragTaskId(null);
    setDropSlot(null);
  }

  function handleTaskTouchStart(task: TaskDTO, event: TouchEvent) {
    const touch = event.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      setTouchDragTaskId(task.id);
      navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
  }

  function handleTaskTouchMove(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touchDragTaskId) {
      if (touchStartPos.current && longPressTimer.current) {
        const dx = touch.clientX - touchStartPos.current.x;
        const dy = touch.clientY - touchStartPos.current.y;
        if (Math.hypot(dx, dy) > TOUCH_MOVE_CANCEL_PX) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      return;
    }
    // Scroll suppression is handled by the native, non-passive touchmove
    // listener effect above — React's synthetic onTouchMove is registered
    // passively at the root (since React 17), so calling preventDefault()
    // here would be a no-op.
    const under = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    const row = under?.closest<HTMLElement>('[data-task-id]');
    const rowTask = row ? tasks.find((t) => t.id === row.dataset.taskId) : undefined;
    if (row && rowTask) {
      // Over the dragged row itself: keep the current slot.
      if (rowTask.id !== touchDragTaskId) setDropSlot(slotAtRow(rowTask, row, touch.clientY));
      return;
    }
    const quad = under?.closest<HTMLElement>('[data-quad]')?.dataset.quad;
    setDropSlot(quad ? { group: quad === 'none' ? 'unflagged' : (quad as Priority), beforeId: null } : null);
  }

  function handleTaskTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
    if (touchDragTaskId && dropSlot) {
      applyPlacement(touchDragTaskId, dropSlot.group, dropSlot.beforeId);
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 300);
    }
    setTouchDragTaskId(null);
    setDropSlot(null);
  }

  function handleToggleDone(taskId: string) {
    // A task only ever appears in Matrix while done === false (getMatrixTasks
    // filters it out otherwise), so the only real transition here is
    // false -> true. Optimistically remove it immediately rather than
    // toggling a strikethrough style in place, since Matrix excludes done
    // tasks from the whole view, not just this task's own list column.
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTransition(async () => {
      try {
        await toggleTaskDone(taskId);
      } catch {
        setTasks(prevTasks);
        window.alert('Could not update the task. Please try again.');
      }
    });
  }

  function handleOpenTask(task: TaskDTO) {
    if (justDraggedRef.current) return;
    setDialog({ task, values: taskToDialogValues(task) });
  }

  function handleSaveDialog(values: TaskDialogValues) {
    if (!dialog) return;
    const taskId = dialog.task.id;
    const dueTime = parseDueTime(values.dueTime);
    startTransition(async () => {
      try {
        const updated = await updateTask({
          id: taskId,
          text: values.text,
          listId: values.listId,
          priority: values.priority,
          due: values.due || null,
          dueTime,
        });
        // The dialog never changes `done`, so the task always stays in this
        // flat, done=false-only array — no filter/append branching needed,
        // unlike the Tasks-phase kanban board's list-grouped state.
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } catch {
        window.alert('Could not save the task. Please try again.');
      }
    });
    setDialog(null);
  }

  function handleDeleteFromDialog() {
    if (!dialog?.task) return;
    const taskId = dialog.task.id;
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTransition(async () => {
      try {
        await deleteTask(taskId);
      } catch {
        setTasks(prevTasks);
        window.alert('Could not delete the task. Please try again.');
      }
    });
    setDialog(null);
  }

  return (
    <div className="pw-matrix">
      <PageHeader title="Matrix" />
      {isNarrow && (
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px', flex: 'none' }}>
          <PillToggle
            ariaLabel="Matrix view"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'matrix', label: 'Matrix' },
              { value: 'unflagged', label: `Unflagged · ${groups.unflagged.length}` },
            ]}
          />
        </div>
      )}
      <div className="pw-matrix-body">
        {(!isNarrow || activeTab === 'matrix' || touchDragTaskId) && (
          <div className="pw-matrix-left">
            <div className="pw-quadgrid">
              {QUADRANT_KEYS.map((key) => (
                <QuadrantPanel
                  key={key}
                  priorityKey={key}
                  tasks={groups[key]}
                  onToggleDone={handleToggleDone}
                  onOpen={handleOpenTask}
                  onTaskDragStart={(task) => setDragTaskId(task.id)}
                  onDragOver={(event: DragEvent) => {
                    event.preventDefault();
                    setDropSlot({ group: key, beforeId: null });
                  }}
                  onDragLeave={() => setDropSlot((prev) => (prev?.group === key && prev.beforeId === null ? null : prev))}
                  onDrop={(event: DragEvent) => {
                    event.preventDefault();
                    handleDrop(key);
                  }}
                  onTaskDragOver={handleTaskDragOver}
                  onTaskDrop={handleTaskDrop}
                  dropBeforeId={dropSlot?.group === key ? dropSlot.beforeId : null}
                  onTaskTouchStart={handleTaskTouchStart}
                  onTaskTouchMove={handleTaskTouchMove}
                  onTaskTouchEnd={handleTaskTouchEnd}
                  touchDragTaskId={touchDragTaskId}
                  isDropTarget={dropSlot?.group === key}
                />
              ))}
            </div>
          </div>
        )}
        {(!isNarrow || activeTab === 'unflagged' || touchDragTaskId) && (
          <UnflaggedPanel
            tasks={groups.unflagged}
            onToggleDone={handleToggleDone}
            onOpen={handleOpenTask}
            onTaskDragStart={(task) => setDragTaskId(task.id)}
            onDragOver={(event) => {
              event.preventDefault();
              setDropSlot({ group: 'unflagged', beforeId: null });
            }}
            onDragLeave={() => setDropSlot((prev) => (prev?.group === 'unflagged' && prev.beforeId === null ? null : prev))}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop('unflagged');
            }}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            dropBeforeId={dropSlot?.group === 'unflagged' ? dropSlot.beforeId : null}
            onSetPriority={isNarrow ? (task, priority) => applyPlacement(task.id, priority, null) : undefined}
            onTaskTouchStart={handleTaskTouchStart}
            onTaskTouchMove={handleTaskTouchMove}
            onTaskTouchEnd={handleTaskTouchEnd}
            touchDragTaskId={touchDragTaskId}
            isDropTarget={dropSlot?.group === 'unflagged'}
          />
        )}
      </div>
      {dialog && (
        <TaskDialog
          open
          mode="edit"
          lists={lists}
          initialValues={dialog.values}
          onClose={() => setDialog(null)}
          onSave={handleSaveDialog}
          onDelete={handleDeleteFromDialog}
        />
      )}
    </div>
  );
}
