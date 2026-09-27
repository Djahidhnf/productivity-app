'use client';

import { useState } from 'react';
import { Dialog } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { PillToggle } from '@/app/components/ui/pill-toggle';
import { Icon } from '@/app/components/icons';
import type { PriorityKey } from '@/app/components/ui/priority-flag';
import type { TaskDTO, TaskListDTO } from './queries';

export interface TaskDialogValues {
  text: string;
  listId: string;
  priority: PriorityKey | null;
  due: string;
  dueTime: string;
  /** Block length in minutes; not edited in the form, just carried through to onSave. */
  duration?: number;
}

export function taskToDialogValues(task: TaskDTO): TaskDialogValues {
  const dueTime =
    task.dueTime == null
      ? ''
      : `${String(Math.floor(task.dueTime / 60)).padStart(2, '0')}:${String(task.dueTime % 60).padStart(2, '0')}`;
  return { text: task.text, listId: task.listId, priority: task.priority, due: task.due ?? '', dueTime };
}

/** 'HH:MM' → minutes since midnight; '' → null. */
export function parseDueTime(value: string): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
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

const NO_PRIORITY = 'none';
type PriorityValue = PriorityKey | typeof NO_PRIORITY;

const PRIORITY_OPTIONS: { value: PriorityValue; label: string }[] = [
  { value: NO_PRIORITY, label: 'None' },
  { value: 'RED', label: 'Do first' },
  { value: 'AMBER', label: 'Schedule' },
  { value: 'BLUE', label: 'Delegate' },
  { value: 'GREEN', label: 'Eliminate' },
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
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
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
        <div className="pw-two" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <Input
            label="Due"
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-2)' }}>Priority</span>
          <PillToggle
            ariaLabel="Priority"
            fullWidth
            value={values.priority ?? NO_PRIORITY}
            onChange={(value) => setValues((v) => ({ ...v, priority: value === NO_PRIORITY ? null : value }))}
            options={PRIORITY_OPTIONS}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, paddingTop: 8 }}>
          {mode === 'edit' && onDelete ? (
            <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
              <Icon name="trash" size={15} />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="sm">Save</Button>
        </div>
      </form>
    </Dialog>
  );
}
