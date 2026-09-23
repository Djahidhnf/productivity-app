'use client';

export type CalView = 'day' | '3day' | 'week' | 'month' | 'year' | 'agenda';

const OPTIONS: { key: CalView; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: '3day', label: '3-Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'agenda', label: 'Agenda' },
];

export interface CalendarViewPillProps {
  value: CalView;
  onChange: (view: CalView) => void;
}

export function CalendarViewPill({ value, onChange }: CalendarViewPillProps) {
  return (
    <div className="pw-viewpill" role="tablist" aria-label="Calendar view">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="tab"
          aria-selected={value === opt.key}
          data-on={value === opt.key ? '1' : '0'}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
