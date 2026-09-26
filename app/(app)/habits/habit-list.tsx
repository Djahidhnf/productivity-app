'use client';

import type { DragEvent } from 'react';
import { HabitCard } from './habit-card';
import type { HabitDTO } from './queries';

export interface HabitListProps {
  habits: HabitDTO[];
  selectedHabitId: string | null;
  todayKey: string;
  heatWeeks: number;
  fillWidth?: boolean;
  onSelect: (habitId: string) => void;
  onToggleLog: (habitId: string, dateKey: string) => void;
  onDragStart: (habitId: string) => void;
  onDropOnCard: (targetId: string) => void;
}

function allowDrop(event: DragEvent) {
  event.preventDefault();
}

export function HabitList({ habits, selectedHabitId, todayKey, heatWeeks, fillWidth, onSelect, onToggleLog, onDragStart, onDropOnCard }: HabitListProps) {
  if (habits.length === 0) {
    return <p className="st-empty" style={{ margin: 0 }}>No habits yet — add one to start tracking.</p>;
  }

  return (
    <>
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          todayKey={todayKey}
          heatWeeks={heatWeeks}
          fillWidth={fillWidth}
          selected={habit.id === selectedHabitId}
          onSelect={() => onSelect(habit.id)}
          onToggleLog={onToggleLog}
          draggable
          onDragStart={() => onDragStart(habit.id)}
          onDragOver={allowDrop}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDropOnCard(habit.id);
          }}
        />
      ))}
    </>
  );
}
