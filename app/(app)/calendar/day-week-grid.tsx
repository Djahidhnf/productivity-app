'use client';

import { CalendarTaskBlock } from './calendar-task-block';
import { HOUR_PX, minutesFromOffset } from './calendar-views';
import { useSwipe } from '@/app/lib/use-swipe';
import type { TaskDTO } from './queries';

export interface DayWeekGridProps {
  dateKeys: string[];
  timedTasksFor: (dateKey: string) => TaskDTO[];
  untimedTasksFor: (dateKey: string) => TaskDTO[];
  onTaskOpen: (task: TaskDTO) => void;
  onGridClick: (dateKey: string, minutes: number) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onGridDrop: (dateKey: string, minutes: number) => void;
  onTaskToggleDone?: (taskId: string) => void;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function dayHeaderParts(dateKey: string): { weekday: string; dayNum: string } {
  const d = new Date(`${dateKey}T00:00:00`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: String(d.getDate()),
  };
}

export function DayWeekGrid({
  dateKeys,
  timedTasksFor,
  untimedTasksFor,
  onTaskOpen,
  onGridClick,
  onTaskDragStart,
  onGridDrop,
  onTaskToggleDone,
  onSwipePrev,
  onSwipeNext,
}: DayWeekGridProps) {
  const { ref, handlers } = useSwipe({ onSwipeLeft: onSwipeNext, onSwipeRight: onSwipePrev });

  return (
    <div ref={ref} className="pw-calgrid pw-scroll" data-dense={dateKeys.length > 3} {...handlers}>
      <div className="pw-calgrid-header">
        <div className="pw-calgrid-gutter" />
        {dateKeys.map((key) => {
          const { weekday, dayNum } = dayHeaderParts(key);
          return (
            <div key={key} className="pw-swipe-follow" style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '8px 4px' }}>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {weekday}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)' }}>{dayNum}</div>
            </div>
          );
        })}
      </div>
      <div className="pw-calgrid-allday">
        <div className="pw-calgrid-gutter pw-calgrid-allday-label">All day</div>
        {dateKeys.map((key) => (
          <div
            key={key}
            className="pw-swipe-follow"
            style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border)', padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {untimedTasksFor(key).map((task) => (
              <div
                key={task.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onTaskOpen(task);
                }}
                style={{
                  fontSize: 'var(--text-2xs)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textDecoration: task.done ? 'line-through' : 'none',
                }}
              >
                {task.text}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="pw-calgrid-body" style={{ height: HOUR_PX * 24 }}>
        <div className="pw-calgrid-gutter">
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_PX, position: 'relative' }}>
              {h > 0 && <span className="pw-calgrid-hour">{h}:00</span>}
            </div>
          ))}
        </div>
        {dateKeys.map((key) => (
          <div
            key={key}
            className="pw-calgrid-col"
            data-daykey={key}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const minutes = minutesFromOffset(event.clientY - rect.top, 30);
              onGridClick(key, minutes);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const minutes = minutesFromOffset(event.clientY - rect.top, 15);
              onGridDrop(key, minutes);
            }}
          >
            {HOURS.map((h) => (
              <div key={h} className="pw-calgrid-hourline" style={{ top: h * HOUR_PX }} />
            ))}
            {timedTasksFor(key).map((task) => (
              <CalendarTaskBlock
                key={task.id}
                task={task}
                onOpen={onTaskOpen}
                onToggleDone={onTaskToggleDone}
                draggable
                onDragStart={() => onTaskDragStart(task)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
