'use client';

import { useState } from 'react';
import type { FreqType } from '@prisma/client';
import { Dialog } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { PillToggle } from '@/app/components/ui/pill-toggle';
import { Button } from '@/app/components/ui/button';

export interface HabitDialogValues {
  name: string;
  freqType: FreqType;
  timesPerWeek: string;
  startDate: string;
}

export interface HabitDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: HabitDialogValues;
  onClose: () => void;
  onSave: (values: HabitDialogValues) => void;
  onDelete?: () => void;
}

export function HabitDialog({ open, mode, initialValues, onClose, onSave, onDelete }: HabitDialogProps) {
  const [values, setValues] = useState(initialValues);
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);

  if (initialValues !== prevInitialValues) {
    setPrevInitialValues(initialValues);
    setValues(initialValues);
  }

  return (
    <Dialog open={open} onClose={onClose} title={mode === 'create' ? 'New habit' : 'Edit habit'}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!values.name.trim()) return;
          onSave(values);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <Input
          label="Habit name"
          placeholder="e.g. Stretch"
          value={values.name}
          onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))}
          autoFocus
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Frequency</span>
          <PillToggle
            ariaLabel="Frequency"
            value={values.freqType}
            onChange={(freqType) => setValues((v) => ({ ...v, freqType }))}
            options={[
              { value: 'DAILY', label: 'Every day' },
              { value: 'WEEKLY', label: 'Weekly' },
            ]}
          />
        </div>
        {values.freqType === 'WEEKLY' && (
          <Input
            label="Times per week"
            type="number"
            min={1}
            max={7}
            value={values.timesPerWeek}
            onChange={(event) => setValues((v) => ({ ...v, timesPerWeek: event.target.value }))}
          />
        )}
        <Input
          label="Start date"
          type="date"
          value={values.startDate}
          onChange={(event) => setValues((v) => ({ ...v, startDate: event.target.value }))}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          {mode === 'edit' && onDelete ? (
            <Button type="button" variant="outline" onClick={onDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit">Save habit</Button>
        </div>
      </form>
    </Dialog>
  );
}
