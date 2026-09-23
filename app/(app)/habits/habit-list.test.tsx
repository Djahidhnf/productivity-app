import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { HabitList } from './habit-list';
import type { HabitDTO } from './queries';

function makeHabit(id: string, order: number): HabitDTO {
  return { id, name: `Habit ${id}`, color: '#c6ff34', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-08-01', order, logs: [] };
}

describe('HabitList', () => {
  test('renders one card per habit', () => {
    render(
      <HabitList
        habits={[makeHabit('a', 0), makeHabit('b', 1)]}
        selectedHabitId="a"
        todayKey="2026-09-23"
        heatWeeks={30}
        onSelect={vi.fn()}
        onToggleLog={vi.fn()}
        onDragStart={vi.fn()}
        onDropOnCard={vi.fn()}
      />
    );
    expect(screen.getByText('Habit a')).toBeInTheDocument();
    expect(screen.getByText('Habit b')).toBeInTheDocument();
  });

  test('shows the empty state when there are no habits', () => {
    render(
      <HabitList
        habits={[]}
        selectedHabitId={null}
        todayKey="2026-09-23"
        heatWeeks={30}
        onSelect={vi.fn()}
        onToggleLog={vi.fn()}
        onDragStart={vi.fn()}
        onDropOnCard={vi.fn()}
      />
    );
    expect(screen.getByText('No habits yet — add one to start tracking.')).toBeInTheDocument();
  });

  test('dropping onto a card calls onDropOnCard with that habit id', () => {
    const onDropOnCard = vi.fn();
    render(
      <HabitList
        habits={[makeHabit('a', 0), makeHabit('b', 1)]}
        selectedHabitId="a"
        todayKey="2026-09-23"
        heatWeeks={30}
        onSelect={vi.fn()}
        onToggleLog={vi.fn()}
        onDragStart={vi.fn()}
        onDropOnCard={onDropOnCard}
      />
    );
    fireEvent.drop(screen.getByText('Habit b'));
    expect(onDropOnCard).toHaveBeenCalledWith('b');
  });
});
