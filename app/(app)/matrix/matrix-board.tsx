'use client';

import { useState, useEffect, useTransition } from 'react';
import type { DragEvent } from 'react';
import type { Priority } from '@prisma/client';
import { QuadrantPanel } from './quadrant-panel';
import { UnflaggedPanel } from './unflagged-panel';
import { groupTasksByPriority } from './matrix-groups';
import { TaskDialog, type TaskDialogValues } from '../tasks/task-dialog';
import { updateTask, deleteTask, toggleTaskDone } from '../tasks/actions';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

const QUADRANT_KEYS: Priority[] = ['RED', 'AMBER', 'BLUE', 'GREEN'];

export interface MatrixBoardProps {
  initialTasks: TaskDTO[];
  lists: TaskListDTO[];
}

function taskToDialogValues(task: TaskDTO): TaskDialogValues {
  const dueTime =
    task.dueTime == null
      ? ''
      : `${String(Math.floor(task.dueTime / 60)).padStart(2, '0')}:${String(task.dueTime % 60).padStart(2, '0')}`;
  return { text: task.text, listId: task.listId, priority: task.priority, due: task.due ?? '', dueTime };
}

function parseDueTime(value: string): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function MatrixBoard({ initialTasks, lists }: MatrixBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ task: TaskDTO; values: TaskDialogValues } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function clearDragState() {
      setDragTaskId(null);
    }
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, []);

  function applyPriorityChange(taskId: string, priority: Priority | null) {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
    startTransition(async () => {
      try {
        await updateTask({
          id: taskId,
          text: target.text,
          listId: target.listId,
          priority,
          due: target.due,
          dueTime: target.dueTime,
        });
      } catch {
        setTasks(prevTasks);
        window.alert('Could not update the task. Please try again.');
      }
    });
  }

  function handleDrop(priority: Priority | null) {
    if (!dragTaskId) return;
    applyPriorityChange(dragTaskId, priority);
    setDragTaskId(null);
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

  const groups = groupTasksByPriority(tasks);

  return (
    <div className="pw-matrix">
      <div className="pw-matrix-left pw-scroll" style={{ flex: 65, minWidth: 0, overflow: 'auto', padding: '0 var(--space-4) 24px clamp(16px, 3vw, 32px)' }}>
        <div className="pw-quadgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)', alignContent: 'start' }}>
          {QUADRANT_KEYS.map((key) => (
            <QuadrantPanel
              key={key}
              priorityKey={key}
              tasks={groups[key]}
              onToggleDone={handleToggleDone}
              onOpen={handleOpenTask}
              onTaskDragStart={(task) => setDragTaskId(task.id)}
              onDragOver={(event: DragEvent) => event.preventDefault()}
              onDrop={(event: DragEvent) => {
                event.preventDefault();
                handleDrop(key);
              }}
              onTaskTouchStart={() => {}}
              onTaskTouchMove={() => {}}
              onTaskTouchEnd={() => {}}
              touchDragTaskId={null}
            />
          ))}
        </div>
      </div>
      <UnflaggedPanel
        tasks={groups.unflagged}
        onToggleDone={handleToggleDone}
        onOpen={handleOpenTask}
        onTaskDragStart={(task) => setDragTaskId(task.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop(null);
        }}
        onTaskTouchStart={() => {}}
        onTaskTouchMove={() => {}}
        onTaskTouchEnd={() => {}}
        touchDragTaskId={null}
      />
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
