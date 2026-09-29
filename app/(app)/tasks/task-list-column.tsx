'use client';

import { useState, type DragEvent, type TouchEvent } from 'react';
import { Icon } from '@/app/components/icons';
import { IconButton } from '@/app/components/ui/icon-button';
import { Input } from '@/app/components/ui/input';
import { TaskCard } from './task-card';
import type { TaskDTO, TaskListDTO } from './queries';

export interface TaskListColumnProps {
  list: TaskListDTO;
  onToggleDone: (taskId: string) => void;
  onOpenTask: (task: TaskDTO) => void;
  onQuickAdd: (listId: string, text: string) => void;
  onDeleteList: (listId: string) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onTaskDrop: (targetListId: string, targetTaskId: string | null) => void;
  onColumnDragStart: () => void;
  onColumnDrop: () => void;
  /** Phone long-press gestures (preview + drag to reorder), when the board provides them. */
  touch?: ColumnTouchProps;
}

export interface ColumnTouchProps {
  onTaskTouchStart: (task: TaskDTO, event: TouchEvent<HTMLElement>) => void;
  /** True while a finger holds a card: native drags and context menus are suppressed. */
  isPressing: () => boolean;
  dragTaskId: string | null;
  /** Where the dragged task would land in this list: before a task, or null for the end. Undefined when not over this list. */
  dropBeforeId?: string | null;
}

export function TaskListColumn({
  list,
  onToggleDone,
  onOpenTask,
  onQuickAdd,
  onDeleteList,
  onTaskDragStart,
  onTaskDrop,
  onColumnDragStart,
  onColumnDrop,
  touch,
}: TaskListColumnProps) {
  const [draft, setDraft] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);

  function submitDraft() {
    const text = draft.trim();
    if (text) onQuickAdd(list.id, text);
    setDraft('');
  }

  function allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  const openTasks = list.tasks.filter((t) => !t.done);
  // Newest-completed first; tasks without a timestamp sort last.
  const doneTasks = list.tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const openCount = openTasks.length;
  const lastOpenId = openTasks.filter((t) => t.id !== touch?.dragTaskId).at(-1)?.id;

  function dropLineFor(taskId: string): 'before' | 'after' | undefined {
    if (!touch?.dragTaskId || touch.dropBeforeId === undefined) return undefined;
    if (touch.dropBeforeId === taskId) return 'before';
    if (touch.dropBeforeId === null && taskId === lastOpenId) return 'after';
    return undefined;
  }

  return (
    <section
      className="pw-list-col"
      data-list-col={list.id}
      onDragOver={allowDrop}
      onDrop={(event) => {
        event.preventDefault();
        onTaskDrop(list.id, null);
      }}
    >
      <div
        className="pw-list-head"
        draggable
        onDragStart={onColumnDragStart}
        onDragOver={allowDrop}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onColumnDrop();
        }}
        style={{ cursor: 'grab' }}
      >
        <h2 className="st-label" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {list.name}
          <span className="st-label-count">{openCount}</span>
        </h2>
        <IconButton label="Delete list" size="sm" onClick={() => onDeleteList(list.id)}>
          <Icon name="trash" size={15} />
        </IconButton>
      </div>
      <form
        className="st-addrow"
        onSubmit={(event) => {
          event.preventDefault();
          submitDraft();
        }}
      >
        <Icon name="plus" size={16} />
        <Input
          variant="bare"
          aria-label={`Add a task to ${list.name}`}
          placeholder="What needs doing?"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setDraft('');
              event.currentTarget.blur();
            }
          }}
          style={{ fontSize: 'var(--text-sm)' }}
        />
      </form>
      <div
        className="pw-tasks-scroll pw-scroll"
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 20 }}
      >
        {openTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleDone={onToggleDone}
            onOpen={onOpenTask}
            draggable
            onDragStart={(event) => {
              // A long touch press drags through the touch gesture, not a native drag.
              if (touch?.isPressing()) event.preventDefault();
              else onTaskDragStart(task);
            }}
            onTouchStart={touch && ((event) => touch.onTaskTouchStart(task, event))}
            onContextMenu={touch && ((event) => touch.isPressing() && event.preventDefault())}
            lifted={touch?.dragTaskId === task.id}
            dropLine={dropLineFor(task.id)}
            onDragOver={allowDrop}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onTaskDrop(list.id, task.id);
            }}
          />
        ))}
        {openTasks.length === 0 && <p className="st-empty">Nothing here.</p>}
        {doneTasks.length > 0 && (
          <>
            <button
              type="button"
              className="pw-completed-toggle"
              aria-expanded={completedOpen}
              onClick={() => setCompletedOpen((open) => !open)}
            >
              <Icon name="right" size={14} />
              Completed ({doneTasks.length})
            </button>
            {completedOpen &&
              doneTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggleDone={onToggleDone} onOpen={onOpenTask} />
              ))}
          </>
        )}
      </div>
    </section>
  );
}
