'use client';

import { useState, useEffect, useTransition } from 'react';
import { TaskListColumn } from './task-list-column';
import { NewListColumn } from './new-list-column';
import { TaskDialog, type TaskDialogValues } from './task-dialog';
import { moveTaskInLists, taskIdsForList, moveListInLists } from './task-reorder';
import type { TaskDTO, TaskListDTO } from './queries';
import {
  createList,
  deleteList,
  reorderLists,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskDone,
  reorderTasks,
} from './actions';

export interface TasksBoardProps {
  initialLists: TaskListDTO[];
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

export function TasksBoard({ initialLists }: TasksBoardProps) {
  const [lists, setLists] = useState(initialLists);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragListId, setDragListId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ task: TaskDTO; values: TaskDialogValues } | null>(null);
  const [, startTransition] = useTransition();

  // A drag abandoned outside any valid drop target (e.g. released over the
  // browser chrome) never reaches an onDrop handler, so dragTaskId/dragListId
  // would otherwise stay stale until the next drag. The native `dragend`
  // event always fires on the drag source when a drag operation concludes,
  // successful or not, and bubbles to window - listen there to always clear
  // both. This subscribes to an external system's events and calls setState
  // from the event callback, not synchronously in the effect body, so it
  // does not trip this project's react-hooks/set-state-in-effect rule.
  useEffect(() => {
    function clearDragState() {
      setDragTaskId(null);
      setDragListId(null);
    }
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, []);

  function handleToggleDone(taskId: string) {
    setLists((prev) =>
      prev.map((list) => ({ ...list, tasks: list.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }))
    );
    startTransition(() => {
      toggleTaskDone(taskId);
    });
  }

  function handleOpenTask(task: TaskDTO) {
    setDialog({ task, values: taskToDialogValues(task) });
  }

  function handleQuickAdd(listId: string, text: string) {
    startTransition(async () => {
      const task = await createTask({ text, listId });
      setLists((prev) => prev.map((list) => (list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list)));
    });
  }

  function handleDeleteList(listId: string) {
    if (!confirm('Delete this list and all its tasks?')) return;
    setLists((prev) => prev.filter((l) => l.id !== listId));
    startTransition(() => {
      deleteList(listId);
    });
  }

  function handleCreateList(name: string) {
    startTransition(async () => {
      const list = await createList(name);
      setLists((prev) => [...prev, { ...list, tasks: [] }]);
    });
  }

  function handleSaveDialog(values: TaskDialogValues) {
    if (!dialog) return;
    const taskId = dialog.task.id;
    const dueTime = parseDueTime(values.dueTime);
    startTransition(async () => {
      const updated = await updateTask({
        id: taskId,
        text: values.text,
        listId: values.listId,
        priority: values.priority,
        due: values.due || null,
        dueTime,
      });
      setLists((prev) =>
        prev.map((list) => ({
          ...list,
          tasks:
            list.id === updated.listId
              ? [...list.tasks.filter((t) => t.id !== taskId), updated]
              : list.tasks.filter((t) => t.id !== taskId),
        }))
      );
    });
    setDialog(null);
  }

  function handleDeleteFromDialog() {
    if (!dialog?.task) return;
    const taskId = dialog.task.id;
    setLists((prev) => prev.map((list) => ({ ...list, tasks: list.tasks.filter((t) => t.id !== taskId) })));
    startTransition(() => {
      deleteTask(taskId);
    });
    setDialog(null);
  }

  function handleTaskDrop(targetListId: string, targetTaskId: string | null) {
    if (!dragTaskId) return;
    const sourceList = lists.find((l) => l.tasks.some((t) => t.id === dragTaskId));
    if (!sourceList) return;
    const sourceListId = sourceList.id;

    const next = moveTaskInLists(lists, dragTaskId, targetListId, targetTaskId);
    setLists(next);

    startTransition(() => {
      if (sourceListId !== targetListId) {
        reorderTasks({ listId: sourceListId, orderedTaskIds: taskIdsForList(next, sourceListId) });
      }
      reorderTasks({ listId: targetListId, orderedTaskIds: taskIdsForList(next, targetListId) });
    });
    setDragTaskId(null);
  }

  function handleColumnDrop(targetListId: string) {
    if (!dragListId) return;
    const next = moveListInLists(lists, dragListId, targetListId);
    setLists(next);
    startTransition(() => {
      reorderLists(next.map((l) => l.id));
    });
    setDragListId(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--pw-vh)' }}>
      <div className="pw-board pw-scroll" style={{ flex: 1, minHeight: 0, paddingTop: 4 }}>
        {lists.map((list) => (
          <TaskListColumn
            key={list.id}
            list={list}
            onToggleDone={handleToggleDone}
            onOpenTask={handleOpenTask}
            onQuickAdd={handleQuickAdd}
            onDeleteList={handleDeleteList}
            onTaskDragStart={(task) => setDragTaskId(task.id)}
            onTaskDrop={handleTaskDrop}
            onColumnDragStart={() => setDragListId(list.id)}
            onColumnDrop={() => handleColumnDrop(list.id)}
          />
        ))}
        <NewListColumn onCreate={handleCreateList} />
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
