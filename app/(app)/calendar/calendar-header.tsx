'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
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

const TITLE_STYLE = {
  fontFamily: 'var(--font-display)',
  fontWeight: 'var(--weight-semibold)',
  fontSize: 'var(--text-lg)',
} as const;

export function CalendarHeader({ title, onPrev, onToday, onNext, onNewTask, picker }: CalendarHeaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <header
      className="pw-calhead"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-3)',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        padding: '0 clamp(16px, 3vw, 32px)',
        flex: 'none',
      }}
    >
      {picker ? (
        <span style={{ position: 'relative' }}>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
            style={{ ...TITLE_STYLE, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
          >
            {title} <span aria-hidden="true">▾</span>
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
        <span style={TITLE_STYLE}>{title}</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <IconButton variant="outline" onClick={onPrev} label="Previous">
          <Icon name="left" size={16} />
        </IconButton>
        <Button variant="secondary" onClick={onToday}>
          Today
        </Button>
        <IconButton variant="outline" onClick={onNext} label="Next">
          <Icon name="right" size={16} />
        </IconButton>
        <Button variant="primary" onClick={onNewTask}>
          New task
        </Button>
      </div>
    </header>
  );
}
