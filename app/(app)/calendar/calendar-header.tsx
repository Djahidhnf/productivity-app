'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { PageHeader } from '@/app/components/shell/page-header';
import { CalendarJumpPicker } from './calendar-jump-picker';

export interface CalendarHeaderPicker {
  mode: 'month' | 'year';
  value: string;
  onPick: (dateKey: string) => void;
}

export interface CalendarHeaderProps {
  title: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onNewTask: () => void;
  picker?: CalendarHeaderPicker;
}

export function CalendarHeader({ title, onPrev, onToday, onNext, onNewTask, picker }: CalendarHeaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const titleNode = picker ? (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((open) => !open)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', letterSpacing: 'inherit' }}
      >
        {title}
        <Icon name="chevrons-up-down" size={18} style={{ color: 'var(--fg-3)' }} />
      </button>
      {pickerOpen && (
        <CalendarJumpPicker
          mode={picker.mode}
          value={picker.value}
          onPick={(dateKey) => {
            picker.onPick(dateKey);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </span>
  ) : (
    title
  );

  return (
    <PageHeader
      className="pw-calhead"
      title={titleNode}
      actions={
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconButton onClick={onPrev} label="Previous">
              <Icon name="left" size={18} />
            </IconButton>
            <Button variant="secondary" size="sm" onClick={onToday}>
              Today
            </Button>
            <IconButton onClick={onNext} label="Next">
              <Icon name="right" size={18} />
            </IconButton>
          </div>
          <Button variant="primary" size="sm" onClick={onNewTask}>
            <Icon name="plus" size={15} />
            New task
          </Button>
        </>
      }
    />
  );
}
