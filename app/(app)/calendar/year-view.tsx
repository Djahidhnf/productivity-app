'use client';

import { buildMonthGrid } from '@/app/lib/calendar-dates';
import { MAX_YEAR, MIN_YEAR, firstOfYearKey, yearOfDateKey } from '@/app/lib/calendar-units';
import { useScrollWindow } from '@/app/lib/use-scroll-window';
import { dayColor, indexTasksByDate } from './calendar-views';
import type { TaskDTO } from './queries';

export interface YearViewProps {
  tasks: TaskDTO[];
  /** A date key; the year containing it is scrolled into view. */
  anchor: string;
  todayKey: string;
  /** Called with January 1 of the year that is now at the top of the view. */
  onVisibleYearChange: (dateKey: string) => void;
  onMonthOpen: (year: number, month: number) => void;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const YEAR_SPAN = 2;
const MONTH_NAMES = Array.from({ length: 12 }, (_, m) => new Date(2000, m, 1).toLocaleDateString('en-US', { month: 'long' }));

export function YearView({ tasks, anchor, todayKey, onVisibleYearChange, onMonthOpen }: YearViewProps) {
  const taskIndex = indexTasksByDate(tasks);
  const { containerRef, onScroll, start, end } = useScrollWindow({
    anchor: yearOfDateKey(anchor),
    min: MIN_YEAR,
    max: MAX_YEAR,
    span: YEAR_SPAN,
    onVisibleChange: (y) => onVisibleYearChange(firstOfYearKey(y)),
  });

  const years: number[] = [];
  for (let y = start; y <= end; y++) years.push(y);

  return (
    <div ref={containerRef} onScroll={onScroll} className="pw-yearscroll pw-scroll">
      {years.map((y) => (
        <section key={y} data-unit={y} className="pw-yearblock">
          <h3 className="pw-yearblock-title">{y}</h3>
          <div className="pw-yearview">
            {MONTH_NAMES.map((label, month) => (
              <div key={month} className="pw-yearview-card">
                <button type="button" className="pw-yearview-label" onClick={() => onMonthOpen(y, month)}>
                  {label}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
                  {WEEKDAY_INITIALS.map((w, i) => (
                    <span key={i} style={{ fontSize: '9px', textAlign: 'center', color: 'var(--text-faint)' }}>
                      {w}
                    </span>
                  ))}
                  {buildMonthGrid(y, month).map((cell) => {
                    const dayTasks = cell.inMonth ? (taskIndex.get(cell.dateKey) ?? []) : [];
                    const bg = cell.inMonth ? dayColor(dayTasks) : 'transparent';
                    const isToday = cell.dateKey === todayKey;
                    const hasPriority = dayTasks.some((t) => t.priority);
                    return (
                      <span
                        key={cell.dateKey}
                        data-datekey={cell.dateKey}
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
                        {cell.inMonth ? String(Number(cell.dateKey.slice(-2))) : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
