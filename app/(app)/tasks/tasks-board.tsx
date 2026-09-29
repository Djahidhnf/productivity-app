'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { TaskListColumn } from './task-list-column';
import { NewListColumn } from './new-list-column';
import { ListTabs } from './list-tabs';
import { PageHeader } from '@/app/components/shell/page-header';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { useDragScroll } from '@/app/lib/use-drag-scroll';
import { TaskDialog, taskToDialogValues, parseDueTime, type TaskDialogValues } from './task-dialog';
import { moveTaskInLists, taskIdsForList, moveListInLists, moveListToIndex } from './task-reorder';
import { useTouchTaskDrag } from './use-touch-task-drag';
import { TaskPreview } from './task-preview';
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

export function TasksBoard({ initialLists }: TasksBoardProps) {
  const [lists, setLists] = useState(initialLists);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragListId, setDragListId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ task: TaskDTO; values: TaskDialogValues } | null>(null);
  const [, startTransition] = useTransition();
  const [activeListId, setActiveListId] = useState<string | null>(initialLists[0]?.id ?? null);
  const { ref: boardRef, handlers: dragScrollHandlers } = useDragScroll<HTMLDivElement>({ innerSelector: '.pw-tasks-scroll' });
  const newListInput = useRef<HTMLInputElement>(null);
  const touchDrag = useTouchTaskDrag(boardRef, {
    groupAttr: 'listCol',
    tasksIn: (listId) => lists.find((l) => l.id === listId)?.tasks.filter((t) => !t.done) ?? [],
    listNameOf: (task) => lists.find((l) => l.id === task.listId)?.name ?? '',
    scrollSelector: '.pw-tasks-scroll',
    onMove: handleTouchMove,
  });

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
    const prevLists = lists;
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        tasks: list.tasks.map((t) =>
          t.id === taskId ? { ...t, done: !t.done, completedAt: t.done ? null : new Date().toISOString() } : t
        ),
      }))
    );
    startTransition(async () => {
      try {
        await toggleTaskDone(taskId);
      } catch {
        setLists(prevLists);
        window.alert('Could not update the task. Please try again.');
      }
    });
  }

  function handleOpenTask(task: TaskDTO) {
    if (touchDrag.isSwallowingClick()) return;
    setDialog({ task, values: taskToDialogValues(task) });
  }

  function handleQuickAdd(listId: string, text: string) {
    startTransition(async () => {
      try {
        const task = await createTask({ text, listId });
        setLists((prev) =>
          prev.map((list) => (list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list))
        );
      } catch {
        window.alert('Could not add the task. Please try again.');
      }
    });
  }

  function handleDeleteList(listId: string) {
    if (!confirm('Delete this list and all its tasks?')) return;
    const prevLists = lists;
    setLists((prev) => prev.filter((l) => l.id !== listId));
    startTransition(async () => {
      try {
        await deleteList(listId);
      } catch {
        setLists(prevLists);
        window.alert('Could not delete the list. Please try again.');
      }
    });
  }

  function handleCreateList(name: string) {
    startTransition(async () => {
      try {
        const list = await createList(name);
        setLists((prev) => [...prev, { ...list, tasks: [] }]);
      } catch {
        window.alert('Could not create the list. Please try again.');
      }
    });
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
        setLists((prev) =>
          prev.map((list) => {
            if (list.id === updated.listId) {
              const hasTask = list.tasks.some((t) => t.id === taskId);
              return {
                ...list,
                tasks: hasTask
                  ? list.tasks.map((t) => (t.id === taskId ? updated : t))
                  : [...list.tasks, updated],
              };
            }
            return { ...list, tasks: list.tasks.filter((t) => t.id !== taskId) };
          })
        );
      } catch {
        window.alert('Could not save the task. Please try again.');
      }
    });
    setDialog(null);
  }

  function handleDeleteFromDialog() {
    if (!dialog?.task) return;
    const taskId = dialog.task.id;
    const prevLists = lists;
    setLists((prev) => prev.map((list) => ({ ...list, tasks: list.tasks.filter((t) => t.id !== taskId) })));
    startTransition(async () => {
      try {
        await deleteTask(taskId);
      } catch {
        setLists(prevLists);
        window.alert('Could not delete the task. Please try again.');
      }
    });
    setDialog(null);
  }

  function handleTaskDrop(targetListId: string, targetTaskId: string | null) {
    if (!dragTaskId) return;
    moveTask(dragTaskId, targetListId, targetTaskId);
    setDragTaskId(null);
  }

  /** Moves a task before `targetTaskId` in a list (null = the end), optimistically, and saves both lists' order. */
  function moveTask(taskId: string, targetListId: string, targetTaskId: string | null) {
    const sourceList = lists.find((l) => l.tasks.some((t) => t.id === taskId));
    if (!sourceList) return;
    const sourceListId = sourceList.id;
    const prevLists = lists;

    const next = moveTaskInLists(lists, taskId, targetListId, targetTaskId);
    setLists(next);

    startTransition(async () => {
      try {
        if (sourceListId !== targetListId) {
          await reorderTasks({ listId: sourceListId, orderedTaskIds: taskIdsForList(next, sourceListId) });
        }
        await reorderTasks({ listId: targetListId, orderedTaskIds: taskIdsForList(next, targetListId) });
      } catch {
        setLists(prevLists);
        window.alert('Could not save the new order. Please try again.');
      }
    });
  }

  function handleTouchMove(taskId: string, targetListId: string, beforeId: string | null) {
    const sourceListId = lists.find((l) => l.tasks.some((t) => t.id === taskId))?.id;
    const next = moveTaskInLists(lists, taskId, targetListId, beforeId);
    const unchanged =
      sourceListId === targetListId && taskIdsForList(next, targetListId).join() === taskIdsForList(lists, targetListId).join();
    if (!unchanged) moveTask(taskId, targetListId, beforeId);
  }

  function saveListOrder(next: TaskListDTO[]) {
    const prevLists = lists;
    setLists(next);
    startTransition(async () => {
      try {
        await reorderLists(next.map((l) => l.id));
      } catch {
        setLists(prevLists);
        window.alert('Could not save the new order. Please try again.');
      }
    });
  }

  function handleTabReorder(listId: string, toIndex: number) {
    const next = moveListToIndex(lists, listId, toIndex);
    if (next !== lists) saveListOrder(next);
  }

  function scrollToColumn(key: string) {
    const column = boardRef.current?.querySelector<HTMLElement>(`[data-list-col="${CSS.escape(key)}"]`);
    column?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // On phones each column fills the board, so the column nearest the scroll
  // position is the one on screen.
  function handleBoardScroll() {
    const board = boardRef.current;
    if (!board || board.clientWidth === 0) return;
    const index = Math.round(board.scrollLeft / board.clientWidth);
    setActiveListId(lists[index]?.id ?? null);
  }

  function handleColumnDrop(targetListId: string) {
    if (!dragListId) return;
    const next = moveListInLists(lists, dragListId, targetListId);
    if (next !== lists) saveListOrder(next);
    setDragListId(null);
  }

  function startNewList() {
    scrollToColumn('new');
    newListInput.current?.focus({ preventScroll: true });
  }

  const openCount = lists.reduce((n, list) => n + list.tasks.filter((t) => !t.done).length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--pw-vh)' }}>
      <PageHeader
        title="Tasks"
        meta={`${openCount} open`}
        actions={
          <IconButton label="New list" onClick={startNewList}>
            <Icon name="folder-plus" size={18} />
          </IconButton>
        }
      />
      <ListTabs
        lists={lists}
        activeId={activeListId}
        onSelect={scrollToColumn}
        onSelectNew={() => scrollToColumn('new')}
        onReorder={handleTabReorder}
      />
      <div
        ref={boardRef}
        className="pw-board pw-scroll"
        style={{ flex: 1, minHeight: 0 }}
        onScroll={handleBoardScroll}
        {...dragScrollHandlers}
      >
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
            touch={{
              onTaskTouchStart: (task, event) => touchDrag.onCardTouchStart(task, event),
              isPressing: touchDrag.isPressing,
              dragTaskId: touchDrag.dragTaskId,
              dropBeforeId: touchDrag.dropSlot?.groupId === list.id ? touchDrag.dropSlot.beforeId : undefined,
            }}
          />
        ))}
        <NewListColumn onCreate={handleCreateList} inputRef={newListInput} />
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
