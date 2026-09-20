'use client';

import { useState } from 'react';
import { Dialog } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { PRIORITY_COLORS, type PriorityKey } from '@/app/components/ui/priority-flag';
import type { TaskListDTO } from './queries';

export interface TaskDialogValues {
  text: string;
  listId: string;
  priority: PriorityKey | null;
  due: string;
  dueTime: string;
}

export interface TaskDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  lists: TaskListDTO[];
  initialValues: TaskDialogValues;
  onClose: () => void;
  onSave: (values: TaskDialogValues) => void;
  onDelete?: () => void;
}

const PRIORITY_OPTIONS: { key: PriorityKey | null; label: string }[] = [
  { key: null, label: 'None' },
  { key: 'RED', label: 'Urgent & important' },
  { key: 'AMBER', label: 'Not urgent but important' },
  { key: 'BLUE', label: 'Urgent but unimportant' },
  { key: 'GREEN', label: 'Not urgent & unimportant' },
];

export function TaskDialog({ open, mode, lists, initialValues, onClose, onSave, onDelete }: TaskDialogProps) {
  const [values, setValues] = useState(initialValues);
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);

  // Reset the form whenever a new initialValues object is passed in (e.g. opening the
  // dialog for a different task), without introducing a state-syncing Effect.
  if (initialValues !== prevInitialValues) {
    setPrevInitialValues(initialValues);
    setValues(initialValues);
  }

  return (
    <Dialog open={open} onClose={onClose} title={mode === 'create' ? 'New task' : 'Edit task'}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(values);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <Input
          label="Task"
          placeholder="What needs doing?"
          value={values.text}
          onChange={(event) => setValues((v) => ({ ...v, text: event.target.value }))}
          autoFocus
        />
        <Select
          label="List"
          options={lists.map((list) => ({ value: list.id, label: list.name }))}
          value={values.listId}
          onChange={(event) => setValues((v) => ({ ...v, listId: event.target.value }))}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Priority</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRIORITY_OPTIONS.map((opt) => {
              const active = values.priority === opt.key;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, priority: opt.key }))}
                  aria-pressed={active}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-pill)',
                    border: `1px solid ${opt.key ? PRIORITY_COLORS[opt.key] : 'var(--border-strong)'}`,
                    background: active ? (opt.key ? PRIORITY_COLORS[opt.key] : 'var(--surface-3)') : 'transparent',
                    color: active && opt.key ? 'var(--on-accent)' : 'var(--text-primary)',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="pw-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <Input
            label="Due date"
            type="date"
            value={values.due}
            onChange={(event) => setValues((v) => ({ ...v, due: event.target.value }))}
          />
          <Input
            label="Time"
            type="time"
            value={values.dueTime}
            onChange={(event) => setValues((v) => ({ ...v, dueTime: event.target.value }))}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          {mode === 'edit' && onDelete ? (
            <Button type="button" variant="outline" onClick={onDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Dialog>
  );
}
