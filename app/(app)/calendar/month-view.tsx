'use client';

import { PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import { monthYearLabel } from '@/app/lib/calendar-dates';
import { MAX_MONTH_INDEX, MIN_MONTH_INDEX, firstOfMonthKey, monthIndexOfDateKey, monthIndexToParts } from '@/app/lib/calendar-units';
import { useScrollWindow } from '@/app/lib/use-scroll-window';
import { buildMonthWeeks, indexTasksByDate } from './calendar-views';
import type { TaskDTO } from './queries';

export interface MonthViewProps {
  tasks: TaskDTO[];
  /** A date key; the month containing it is scrolled into view. */
  anchor: string;
  todayKey: string;
  /** Called with the first day of the month that is now at the top of the view. */
  onVisibleMonthChange: (dateKey: string) => void;
  /** Clicking a day cell opens that day. */
  onDayOpen: (dateKey: string) => void;
  onTaskOpen: (task: TaskDTO) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onCellDrop: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SPAN = 6;
/** Height of the sticky weekday row; keep in sync with `.pw-monthscroll-weekdays` in layout.css. */
export const WEEKDAY_ROW_PX = 28;

export function MonthView({ tasks, anchor, todayKey, onVisibleMonthChange, onDayOpen, onTaskOpen, onTaskDragStart, onCellDrop }: MonthViewProps) {
  const taskIndex = indexTasksByDate(tasks);
  const { containerRef, onScroll, start, end } = useScrollWindow({
    anchor: monthIndexOfDateKey(anchor),
    min: MIN_MONTH_INDEX,
    max: MAX_MONTH_INDEX,
    span: MONTH_SPAN,
    scrollOffset: WEEKDAY_ROW_PX,
    onVisibleChange: (index) => onVisibleMonthChange(firstOfMonthKey(index)),
  });

  const months: number[] = [];
  for (let index = start; index <= end; index++) months.push(index);

  return (
    <div ref={containerRef} onScroll={onScroll} className="pw-monthscroll pw-scroll">
      <div className="pw-monthscroll-weekdays">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      {months.map((index) => {
        const { year, month } = monthIndexToParts(index);
        const weeks = buildMonthWeeks(taskIndex, year, month);
        return (
          <section key={index} data-unit={index} className="pw-monthblock">
            <h3 className="pw-monthblock-title">{monthYearLabel(firstOfMonthKey(index))}</h3>
            <div className="pw-monthblock-grid">
              {weeks.flat().map((cell, slot) =>
                cell === null ? (
                  <div key={`blank-${slot}`} className="pw-monthblock-blank" />
                ) : (
                  <div
                    key={cell.dateKey}
                    className="pw-monthblock-cell"
                    data-datekey={cell.dateKey}
                    data-today={cell.dateKey === todayKey}
                    onClick={() => onDayOpen(cell.dateKey)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      onCellDrop(cell.dateKey);
                    }}
                  >
                    <span className="pw-monthblock-daynum">{Number(cell.dateKey.slice(-2))}</span>
                    {cell.chips.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          onTaskDragStart(task);
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onTaskOpen(task);
                        }}
                        className="pw-monthblock-chip"
                        data-done={task.done || undefined}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: 2, flex: 'none', background: task.priority ? PRIORITY_COLORS[task.priority] : 'var(--border-strong)' }} />
                        <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>{task.text}</span>
                      </div>
                    ))}
                    {cell.moreCount > 0 && (
                      <span
                        onClick={(event) => event.stopPropagation()}
                        style={{ fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', color: 'var(--fg-3)' }}
                      >
                        +{cell.moreCount} more
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
