'use client';

import { useState, type DragEvent } from 'react';
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
            onDragStart={() => onTaskDragStart(task)}
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
