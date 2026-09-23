'use client';

import { CalendarTaskBlock } from './calendar-task-block';
import { HOUR_PX } from './calendar-views';
import type { TaskDTO } from './queries';

export interface DayWeekGridProps {
  dateKeys: string[];
  timedTasksFor: (dateKey: string) => TaskDTO[];
  untimedTasksFor: (dateKey: string) => TaskDTO[];
  onTaskOpen: (task: TaskDTO) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function dayHeaderParts(dateKey: string): { weekday: string; dayNum: string } {
  const d = new Date(`${dateKey}T00:00:00`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: String(d.getDate()),
  };
}

export function DayWeekGrid({ dateKeys, timedTasksFor, untimedTasksFor, onTaskOpen }: DayWeekGridProps) {
  return (
    <div className="pw-calgrid pw-scroll">
      <div className="pw-calgrid-header">
        <div className="pw-calgrid-gutter" />
        {dateKeys.map((key) => {
          const { weekday, dayNum } = dayHeaderParts(key);
          return (
            <div key={key} style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '8px 4px' }}>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {weekday}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)' }}>{dayNum}</div>
            </div>
          );
        })}
      </div>
      <div className="pw-calgrid-allday">
        <div
          className="pw-calgrid-gutter"
          style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', paddingLeft: 4 }}
        >
          All day
        </div>
        {dateKeys.map((key) => (
          <div key={key} style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border)', padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              {h > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -7,
                    right: 8,
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--text-faint)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {h}:00
                </span>
              )}
            </div>
          ))}
        </div>
        {dateKeys.map((key) => (
          <div key={key} className="pw-calgrid-col" data-daykey={key}>
            {HOURS.map((h) => (
              <div key={h} className="pw-calgrid-hourline" style={{ top: h * HOUR_PX }} />
            ))}
            {timedTasksFor(key).map((task) => (
              <CalendarTaskBlock key={task.id} task={task} onOpen={onTaskOpen} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
