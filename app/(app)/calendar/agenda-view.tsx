'use client';

import { PriorityFlag } from '@/app/components/ui/priority-flag';
import { calendarDateLabel } from '@/app/lib/calendar-dates';
import type { AgendaGroup } from './calendar-views';
import type { TaskDTO } from './queries';

export interface AgendaViewProps {
  groups: AgendaGroup[];
  todayKey: string;
  onTaskOpen: (task: TaskDTO) => void;
}

function longDayLabel(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function AgendaView({ groups, todayKey, onTaskOpen }: AgendaViewProps) {
  if (groups.length === 0) {
    return <p className="st-empty" style={{ margin: 0, padding: '0 var(--pw-gutter)' }}>Nothing scheduled in the next 60 days.</p>;
  }

  return (
    <div className="pw-scroll" style={{ display: 'flex', flexDirection: 'column', padding: '0 var(--pw-gutter) 96px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {groups.map((group) => (
        <section
          key={group.dateKey}
          className="pw-two"
          style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', gap: '4px 24px', padding: '16px 0', borderTop: '1px solid var(--border-1)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 600, color: group.dateKey === todayKey ? 'var(--fg-1)' : 'var(--fg-2)' }}>
              {calendarDateLabel(group.dateKey, todayKey)}
            </span>
            <span className="st-eyebrow">{longDayLabel(group.dateKey)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {group.items.map(({ task, timeLabel }) => (
              <div
                key={task.id}
                className="pw-agenda-row"
                onClick={() => onTaskOpen(task)}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--fg-3)', width: 104, flex: 'none' }}>
                  {timeLabel}
                </span>
                {task.priority ? (
                  <PriorityFlag priority={task.priority} />
                ) : (
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--border-strong)', flex: 'none' }} />
                )}
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textDecoration: task.done ? 'line-through' : 'none',
                    color: task.done ? 'var(--fg-3)' : 'var(--fg-1)',
                  }}
                >
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
