'use client';

import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { monthYearLabel } from '@/app/lib/calendar-dates';
import { habitColor } from '@/app/lib/habit-color';
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
  const color = habitColor(habit.color);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {isNarrow && (
        <button
          type="button"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: '4px 0', color: 'var(--fg-2)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer' }}
        >
          <Icon name="left" size={16} />
          All habits
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</div>
          <div className="st-eyebrow">{freqLabel}</div>
        </div>
        <IconButton onClick={onEdit} label="Edit habit">
          <Icon name="pencil" size={16} />
        </IconButton>
        <IconButton onClick={onDelete} label="Delete habit">
          <Icon name="trash" size={16} />
        </IconButton>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, padding: '20px 0', borderTop: '1px solid var(--border-1)', borderBottom: '1px solid var(--border-1)' }}>
        {[
          { value: String(streak), label: 'Day streak' },
          { value: String(habit.logs.length), label: 'Check-ins' },
          { value: `${monthlyPct}%`, label: 'This month' },
        ].map((stat) => (
          // Value first in the DOM, shown under its label.
          <div key={stat.label} className="pw-stat" style={{ flexDirection: 'column-reverse' }}>
            <span className="pw-stat-value">{stat.value}</span>
            <span className="st-label">{stat.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <IconButton size="sm" onClick={onMonthPrev} label="Previous month">
            <Icon name="left" size={16} />
          </IconButton>
          <span style={{ fontWeight: 500 }}>{monthYearLabel(monthKey)}</span>
          <IconButton size="sm" onClick={onMonthNext} label="Next month">
            <Icon name="right" size={16} />
          </IconButton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="st-label" style={{ textAlign: 'center' }}>
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
                maxHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                borderRadius: 6,
                background: cell.logged ? color : 'transparent',
                color: cell.logged ? 'var(--accent-fg)' : cell.inMonth ? 'var(--fg-1)' : 'var(--fg-disabled)',
                boxShadow: cell.isToday ? 'inset 0 0 0 1.5px var(--fg-1)' : undefined,
                fontWeight: cell.isToday ? 600 : 400,
                opacity: cell.future ? 0.45 : 1,
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
