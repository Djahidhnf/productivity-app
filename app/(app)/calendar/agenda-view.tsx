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

export function AgendaView({ groups, todayKey, onTaskOpen }: AgendaViewProps) {
  if (groups.length === 0) {
    return (
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-6) clamp(16px, 3vw, 32px)' }}>
        Nothing scheduled in the next 60 days.
      </p>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: '0 clamp(16px, 3vw, 32px) 24px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
      }}
    >
      {groups.map((group) => (
        <div key={group.dateKey} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lg)' }}>
              {Number(group.dateKey.slice(-2))}
            </div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{calendarDateLabel(group.dateKey, todayKey)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {group.items.map(({ task, timeLabel }) => (
              <div
                key={task.id}
                onClick={() => onTaskOpen(task)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', width: 56, flex: 'none' }}>
                  {timeLabel}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 'var(--text-sm)',
                    textDecoration: task.done ? 'line-through' : 'none',
                    color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
                  }}
                >
                  {task.text}
                </span>
                {task.priority && <PriorityFlag priority={task.priority} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
