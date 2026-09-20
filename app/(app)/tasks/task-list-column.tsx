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
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function submitDraft() {
    const text = draft.trim();
    if (text) onQuickAdd(list.id, text);
    setDraft('');
    setAdding(false);
  }

  function allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  return (
    <div
      className="pw-list-col"
      onDragOver={allowDrop}
      onDrop={(event) => {
        event.preventDefault();
        onTaskDrop(list.id, null);
      }}
    >
      <div
        draggable
        onDragStart={onColumnDragStart}
        onDragOver={allowDrop}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onColumnDrop();
        }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, cursor: 'grab', padding: '2px 0' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Icon name="grip" size={15} style={{ color: 'var(--text-faint)' }} />
          <h4
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-semibold)',
              fontSize: 'var(--text-sm)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {list.name}{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 'var(--weight-regular)', fontFamily: 'var(--font-mono)' }}>
              {list.tasks.length}
            </span>
          </h4>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconButton label="Add task" variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size={15} />
          </IconButton>
          <IconButton label="Delete list" variant="ghost" size="sm" onClick={() => onDeleteList(list.id)}>
            <Icon name="trash" size={15} />
          </IconButton>
        </div>
      </div>
      <div
        className="pw-tasks-scroll pw-scroll"
        style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 20 }}
      >
        {adding && (
          <Input
            size="sm"
            autoFocus
            placeholder="Task name, Enter to add…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitDraft();
              if (event.key === 'Escape') {
                setDraft('');
                setAdding(false);
              }
            }}
            onBlur={() => {
              if (!draft.trim()) setAdding(false);
              else submitDraft();
            }}
          />
        )}
        {list.tasks.map((task) => (
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
        {list.tasks.length === 0 && !adding && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '6px 4px' }}>No tasks.</p>
        )}
      </div>
    </div>
  );
}
