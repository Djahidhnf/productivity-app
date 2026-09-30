'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import type { DragEvent } from 'react';
import type { Priority } from '@prisma/client';
import { QuadrantPanel } from './quadrant-panel';
import { UnflaggedPanel } from './unflagged-panel';
import { groupTasksByPriority, groupKeyOf, groupTaskIds, placeTask, type MatrixGroupKey } from './matrix-groups';
import { TaskDialog, taskToDialogValues, parseDueTime, type TaskDialogValues } from '../tasks/task-dialog';
import { updateTask, deleteTask, toggleTaskDone, placeMatrixTask } from '../tasks/actions';
import { useTouchTaskDrag } from '../tasks/use-touch-task-drag';
import { TaskPreview } from '../tasks/task-preview';
import { PageHeader } from '@/app/components/shell/page-header';
import { PillToggle } from '@/app/components/ui/pill-toggle';
import { useMediaQuery } from '@/app/lib/use-media-query';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

const QUADRANT_KEYS: Priority[] = ['RED', 'AMBER', 'BLUE', 'GREEN'];

/** Where a dragged task would land: a group, before a task in it (null = at the end). */
interface DropSlot {
  group: MatrixGroupKey;
  beforeId: string | null;
}

function priorityOfGroup(group: MatrixGroupKey): Priority | null {
  return group === 'unflagged' ? null : group;
}

/** Quadrant containers carry `data-quad="RED"`…; the Unflagged panel carries `data-quad="none"`. */
function groupOfQuadAttr(quad: string): MatrixGroupKey {
  return quad === 'none' ? 'unflagged' : (quad as Priority);
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
  const [, startTransition] = useTransition();
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clearDragState() {
      setDragTaskId(null);
      setDropSlot(null);
    }
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, []);

  const groups = groupTasksByPriority(tasks);
  const touchDrag = useTouchTaskDrag(boardRef, {
    groupAttr: 'quad',
    tasksIn: (quad) => groups[groupOfQuadAttr(quad)],
    listNameOf: (task) => lists.find((l) => l.id === task.listId)?.name ?? '',
    scrollSelector: '.pw-scroll',
    onMove: (taskId, quad, beforeId) => applyPlacement(taskId, groupOfQuadAttr(quad), beforeId),
  });
  const touchDropSlot: DropSlot | null = touchDrag.dropSlot
    ? { group: groupOfQuadAttr(touchDrag.dropSlot.groupId), beforeId: touchDrag.dropSlot.beforeId }
    : null;
  // A mouse drag and a touch drag never run at once.
  const activeSlot = dropSlot ?? touchDropSlot;
  const rowTouch = {
    onTaskTouchStart: touchDrag.onCardTouchStart,
    isPressing: touchDrag.isPressing,
    dragTaskId: touchDrag.dragTaskId,
  };

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
    if (touchDrag.isSwallowingClick()) return;
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
          reminderOffset: values.reminderOffset ?? null,
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
    <div className="pw-matrix" ref={boardRef}>
      <PageHeader title="Eisenhower's Matrix" />
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
        {(!isNarrow || activeTab === 'matrix') && (
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
                  dropBeforeId={activeSlot?.group === key ? activeSlot.beforeId : null}
                  touch={rowTouch}
                  isDropTarget={activeSlot?.group === key}
                />
              ))}
            </div>
          </div>
        )}
        {(!isNarrow || activeTab === 'unflagged') && (
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
            dropBeforeId={activeSlot?.group === 'unflagged' ? activeSlot.beforeId : null}
            onSetPriority={isNarrow ? (task, priority) => applyPlacement(task.id, priority, null) : undefined}
            dragDisabled={isNarrow}
            // On a phone the Unflagged list stands alone: a long press previews
            // a task but can't drag it anywhere (the flag button moves it).
            touch={{ ...rowTouch, onTaskTouchStart: (task, event) => touchDrag.onCardTouchStart(task, event, !isNarrow) }}
            isDropTarget={activeSlot?.group === 'unflagged'}
          />
        )}
      </div>
      {touchDrag.preview && <TaskPreview {...touchDrag.preview} onClose={touchDrag.closePreview} />}
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
