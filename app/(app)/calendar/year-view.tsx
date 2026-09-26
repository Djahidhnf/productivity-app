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
  onDayOpen: (dateKey: string) => void;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const YEAR_SPAN = 2;
const MONTH_NAMES = Array.from({ length: 12 }, (_, m) => new Date(2000, m, 1).toLocaleDateString('en-US', { month: 'long' }));

export function YearView({ tasks, anchor, todayKey, onVisibleYearChange, onMonthOpen, onDayOpen }: YearViewProps) {
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
              <div key={month} className="pw-yearview-card" data-month={month} onClick={() => onMonthOpen(y, month)}>
                <button
                  type="button"
                  className="pw-yearview-label"
                  data-current={todayKey.startsWith(`${y}-${String(month + 1).padStart(2, '0')}`) || undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMonthOpen(y, month);
                  }}
                >
                  {label}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2 }}>
                  {WEEKDAY_INITIALS.map((w, i) => (
                    <span key={i} style={{ fontSize: 10, textAlign: 'center', color: 'var(--fg-3)', paddingBottom: 2 }}>
                      {w}
                    </span>
                  ))}
                  {buildMonthGrid(y, month).map((cell) => {
                    const dayTasks = cell.inMonth ? (taskIndex.get(cell.dateKey) ?? []) : [];
                    const dot = cell.inMonth ? dayColor(dayTasks) : 'transparent';
                    const isToday = cell.dateKey === todayKey;
                    return (
                      <span
                        key={cell.dateKey}
                        data-datekey={cell.dateKey}
                        onClick={
                          cell.inMonth
                            ? (event) => {
                                event.stopPropagation();
                                onDayOpen(cell.dateKey);
                              }
                            : undefined
                        }
                        className={cell.inMonth ? 'pw-yearview-day' : undefined}
                        style={{
                          height: 30,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          borderRadius: 6,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          lineHeight: 1,
                          background: isToday ? 'var(--surface-inverse)' : undefined,
                          color: isToday ? 'var(--fg-inverse)' : 'var(--fg-1)',
                        }}
                      >
                        <span>{cell.inMonth ? String(Number(cell.dateKey.slice(-2))) : ''}</span>
                        {dot !== 'transparent' && (
                          <span data-dot style={{ width: 4, height: 4, borderRadius: 999, background: isToday ? 'var(--fg-inverse)' : dot }} />
                        )}
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
