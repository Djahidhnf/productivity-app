'use client';

import type { DragEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { Icon } from '@/app/components/icons';
import { habitStreak, buildHeatCells } from './habit-calc';
import type { HabitDTO } from './queries';

export interface HabitCardProps {
  habit: HabitDTO;
  todayKey: string;
  heatWeeks: number;
  selected: boolean;
  onSelect: () => void;
  onToggleLog: (habitId: string, dateKey: string) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
}

export function HabitCard({
  habit,
  todayKey,
  heatWeeks,
  selected,
  onSelect,
  onToggleLog,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: HabitCardProps) {
  const streak = habitStreak(habit.logs, todayKey);
  const loggedToday = habit.logs.includes(todayKey);
  const { cells, startLabel } = buildHeatCells(habit.logs, habit.startDate, todayKey, heatWeeks);
  const freqLabel = habit.freqType === 'DAILY' ? 'Daily' : `${habit.timesPerWeek}x / week`;

  return (
    <div
      onClick={onSelect}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-2xl)',
        cursor: 'pointer',
        background: selected ? `color-mix(in srgb, ${habit.color} 8%, var(--surface))` : 'var(--surface)',
        border: `1px solid ${selected ? habit.color : 'var(--border)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="grip" size={15} style={{ color: 'var(--text-faint)', cursor: 'grab' }} />
        <CheckToggle checked={loggedToday} onToggle={() => onToggleLog(habit.id, todayKey)} label={habit.name} accentColor={habit.color} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: habit.color, flex: 'none' }} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-display)',
            fontWeight: 'var(--weight-semibold)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {habit.name}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', flex: 'none' }}>{freqLabel}</span>
        {streak > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-secondary)', flex: 'none' }}>
            <Icon name="flame" size={13} />
            {streak}
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 13px)', gap: 0, justifyContent: 'start', overflow: 'hidden', borderRadius: 'var(--radius-xs)' }}>
        {cells.map((cell) => {
          const inert = cell.future || cell.beforeStart;
          return (
            <div
              key={cell.dateKey}
              title={cell.future ? undefined : cell.dateKey}
              onClick={
                inert
                  ? (event) => event.stopPropagation()
                  : (event) => {
                      event.stopPropagation();
                      onToggleLog(habit.id, cell.dateKey);
                    }
              }
              style={{
                width: 13,
                height: 13,
                background: cell.future ? 'transparent' : cell.logged ? habit.color : 'var(--surface-3)',
                cursor: inert ? 'default' : 'pointer',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>
        <span>{startLabel}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
