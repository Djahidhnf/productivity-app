'use client';

import { dayColor } from './calendar-views';
import type { TaskDTO } from './queries';

export interface YearMonthData {
  year: number;
  month: number;
  label: string;
  days: { dateKey: string; dayNum: string; inMonth: boolean }[];
}

export interface YearViewProps {
  months: YearMonthData[];
  tasksByDate: (dateKey: string) => TaskDTO[];
  onMonthOpen: (year: number, month: number) => void;
  todayKey: string;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function YearView({ months, tasksByDate, onMonthOpen, todayKey }: YearViewProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 'var(--space-4)',
        padding: '0 clamp(16px, 3vw, 32px) 24px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
      }}
    >
      {months.map((m) => (
        <div key={`${m.year}-${m.month}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 8 }}>
          <button
            type="button"
            onClick={() => onMonthOpen(m.year, m.month)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-semibold)',
              fontSize: 'var(--text-sm)',
              padding: 0,
              marginBottom: 4,
            }}
          >
            {m.label}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
            {WEEKDAY_INITIALS.map((w, i) => (
              <span key={i} style={{ fontSize: '9px', textAlign: 'center', color: 'var(--text-faint)' }}>
                {w}
              </span>
            ))}
            {m.days.map((d) => {
              const dayTasks = d.inMonth ? tasksByDate(d.dateKey) : [];
              const bg = d.inMonth ? dayColor(dayTasks) : 'transparent';
              const isToday = d.dateKey === todayKey;
              const hasPriority = dayTasks.some((t) => t.priority);
              return (
                <span
                  key={d.dateKey}
                  data-datekey={d.dateKey}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    borderRadius: '50%',
                    background: bg,
                    border: isToday ? '1px solid var(--accent)' : 'none',
                    color: hasPriority ? 'var(--neutral-900)' : isToday ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {d.inMonth ? d.dayNum : ''}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
