'use client';

import { useState } from 'react';
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
          onToday={() => {
            onToday();
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </span>
  ) : (
    <button type="button" className="pw-calhead-today" title="Back to today" onClick={onToday}>
      {title}
    </button>
  );

  return (
    <PageHeader
      className="pw-calhead"
      title={titleNode}
      actions={
        <>
          {/* Phones swipe between ranges instead; the arrows stay for mouse users. */}
          <div className="pw-calhead-arrows">
            <IconButton onClick={onPrev} label="Previous">
              <Icon name="left" size={18} />
            </IconButton>
            <IconButton onClick={onNext} label="Next">
              <Icon name="right" size={18} />
            </IconButton>
          </div>
          <IconButton onClick={onNewTask} label="New task" variant="primary">
            <Icon name="plus" size={20} />
          </IconButton>
        </>
      }
    />
  );
}
