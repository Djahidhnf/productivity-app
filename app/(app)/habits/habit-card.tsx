'use client';

import type { DragEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { Icon } from '@/app/components/icons';
import { useElementWidth } from '@/app/lib/use-element-width';
import { habitColor } from '@/app/lib/habit-color';
import { habitStreak, buildHeatCells, heatWeeksForWidth, HEAT_CELL_PX, HEAT_GAP_PX } from './habit-calc';
import type { HabitDTO } from './queries';

export interface HabitCardProps {
  habit: HabitDTO;
  todayKey: string;
  heatWeeks: number;
  /** Show as many weeks as fit the card's width (phones), instead of exactly heatWeeks. */
  fillWidth?: boolean;
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
  fillWidth = false,
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
  const { ref: heatRef, width: heatWidth } = useElementWidth<HTMLDivElement>();
  const weeks = fillWidth && heatWidth ? heatWeeksForWidth(heatWidth) : heatWeeks;
  const { cells, startLabel } = buildHeatCells(habit.logs, habit.startDate, todayKey, weeks);
  const freqLabel = habit.freqType === 'DAILY' ? 'Daily' : `${habit.timesPerWeek}x / week`;
  const color = habitColor(habit.color);

  return (
    <div
      onClick={onSelect}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="pw-habit-row"
      data-selected={selected || undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name="grip" size={14} style={{ color: 'var(--fg-disabled)', cursor: 'grab', marginLeft: -4 }} />
        <CheckToggle checked={loggedToday} onToggle={() => onToggleLog(habit.id, todayKey)} label={habit.name} />
        <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--fg-3)' }}>
            {freqLabel}
            {habit.time != null && habit.reminderOffset != null && <Icon name="bell" size={11} aria-label="Reminder set" aria-hidden={false} role="img" />}
          </span>
        </span>
        {streak > 0 && (
          <span title="Day streak" style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--fg-2)', flex: 'none' }}>
            <Icon name="flame" size={14} style={{ color: 'var(--fg-3)' }} />
            {streak}
          </span>
        )}
      </div>
      <div
        ref={heatRef}
        className="pw-heatgrid"
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridTemplateRows: `repeat(7, ${HEAT_CELL_PX}px)`,
          gridAutoColumns: `${HEAT_CELL_PX}px`,
          gap: HEAT_GAP_PX,
          justifyContent: fillWidth ? 'space-between' : 'start',
          overflow: 'hidden',
        }}
      >
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
                width: HEAT_CELL_PX,
                height: HEAT_CELL_PX,
                borderRadius: 2,
                background: cell.future ? 'transparent' : cell.logged ? color : 'var(--surface-active)',
                boxShadow: cell.future ? 'inset 0 0 0 1px var(--border-1)' : undefined,
                cursor: inert ? 'default' : 'pointer',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--fg-3)' }}>
        <span>{startLabel}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
