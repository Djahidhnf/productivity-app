'use client';

import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { monthYearLabel } from '@/app/lib/calendar-dates';
import { habitStreak, habitMonthlyPct, buildHabitMonthCells } from './habit-calc';
import type { HabitDTO } from './queries';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface HabitDetailProps {
  habit: HabitDTO;
  todayKey: string;
  monthKey: string;
  isNarrow: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleLog: (dateKey: string) => void;
  onMonthPrev: () => void;
  onMonthNext: () => void;
}

export function HabitDetail({ habit, todayKey, monthKey, isNarrow, onBack, onEdit, onDelete, onToggleLog, onMonthPrev, onMonthNext }: HabitDetailProps) {
  const streak = habitStreak(habit.logs, todayKey);
  const monthlyPct = habitMonthlyPct(habit, habit.logs, todayKey);
  const freqLabel = habit.freqType === 'DAILY' ? 'Every day' : `${habit.timesPerWeek}x / week`;
  const monthCells = buildHabitMonthCells(habit.logs, monthKey, todayKey);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {isNarrow && (
        <button
          type="button"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: '4px 0', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', cursor: 'pointer' }}
        >
          <Icon name="left" size={16} />
          All habits
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: habit.color, flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginTop: 2 }}>{freqLabel}</div>
        </div>
        <IconButton variant="ghost" onClick={onEdit} label="Edit habit">
          <Icon name="pencil" size={16} />
        </IconButton>
        <IconButton variant="ghost" onClick={onDelete} label="Delete habit">
          <Icon name="trash" size={16} />
        </IconButton>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-2)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>{streak}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>Day streak</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-2)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>{habit.logs.length}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>Check-ins</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-2)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)', color: 'var(--accent)' }}>{monthlyPct}%</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>This month</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <IconButton variant="ghost" size="sm" onClick={onMonthPrev} label="Previous month">
            <Icon name="left" size={15} />
          </IconButton>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{monthYearLabel(monthKey)}</span>
          <IconButton variant="ghost" size="sm" onClick={onMonthNext} label="Next month">
            <Icon name="right" size={15} />
          </IconButton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>
              {label}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {monthCells.map((cell) => (
            <div
              key={cell.dateKey}
              title={cell.dateKey}
              onClick={cell.future ? undefined : () => onToggleLog(cell.dateKey)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                borderRadius: 'var(--radius-sm)',
                background: cell.logged ? habit.color : cell.inMonth ? 'var(--surface-2)' : 'transparent',
                color: cell.logged ? 'var(--on-accent)' : cell.isToday ? 'var(--accent)' : cell.inMonth ? 'var(--text-secondary)' : 'var(--text-faint)',
                border: cell.isToday ? '1px solid var(--accent)' : '1px solid transparent',
                opacity: cell.future ? 0.5 : 1,
                cursor: cell.future ? 'default' : 'pointer',
              }}
            >
              {cell.dayNum}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
