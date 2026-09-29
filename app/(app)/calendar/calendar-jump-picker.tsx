'use client';

import { useEffect, useState } from 'react';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { MAX_YEAR, MIN_YEAR, clampYear, firstOfMonthKey, firstOfYearKey, yearOfDateKey } from '@/app/lib/calendar-units';

export interface CalendarJumpPickerProps {
  mode: 'month' | 'year';
  /** The date key the calendar is currently on. */
  value: string;
  /** Receives YYYY-MM-01 in month mode and YYYY-01-01 in year mode. */
  onPick: (dateKey: string) => void;
  /** Jumps back to today, when provided. */
  onToday?: () => void;
  onClose: () => void;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CalendarJumpPicker({ mode, value, onPick, onToday, onClose }: CalendarJumpPickerProps) {
  const [yearText, setYearText] = useState(String(yearOfDateKey(value)));
  const currentYear = yearOfDateKey(value);
  const currentMonth = Number(value.slice(5, 7)) - 1;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Only a full four-digit year applies, so a half-typed "20" never jumps to 1900.
  const trimmedYear = yearText.trim();
  const year = /^\d{4}$/.test(trimmedYear) ? clampYear(Number(trimmedYear)) : null;

  function stepYear(delta: number) {
    setYearText(String(clampYear((year ?? currentYear) + delta)));
  }

  return (
    <>
      <div className="pw-jump-backdrop" onClick={onClose} />
      <div className="pw-jump" role="dialog" aria-label="Jump to date">
        <div className="pw-jump-year">
          <IconButton size="sm" onClick={() => stepYear(-1)} label="Previous year">
            <Icon name="left" size={14} />
          </IconButton>
          <input
            className="pw-jump-input"
            aria-label="Year"
            inputMode="numeric"
            value={yearText}
            onChange={(event) => setYearText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && mode === 'year' && year !== null) onPick(firstOfYearKey(year));
            }}
          />
          <IconButton size="sm" onClick={() => stepYear(1)} label="Next year">
            <Icon name="right" size={14} />
          </IconButton>
        </div>
        <div className="pw-jump-hint">
          {MIN_YEAR}–{MAX_YEAR}
        </div>
        {mode === 'month' ? (
          <div className="pw-jump-months">
            {MONTH_LABELS.map((label, month) => (
              <button
                key={label}
                type="button"
                data-on={year === currentYear && month === currentMonth ? '1' : '0'}
                disabled={year === null}
                onClick={() => year !== null && onPick(firstOfMonthKey(year * 12 + month))}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="pw-jump-go" disabled={year === null} onClick={() => year !== null && onPick(firstOfYearKey(year))}>
            Go
          </button>
        )}
        {onToday && (
          <button type="button" className="pw-jump-go" onClick={onToday}>
            Today
          </button>
        )}
      </div>
    </>
  );
}
