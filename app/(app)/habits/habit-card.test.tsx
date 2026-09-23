import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { HabitCard } from './habit-card';
import type { HabitDTO } from './queries';

const habit: HabitDTO = {
  id: 'h1',
  name: 'Stretch',
  color: '#c6ff34',
  freqType: 'DAILY',
  timesPerWeek: null,
  startDate: '2026-08-01',
  order: 0,
  logs: ['2026-09-21', '2026-09-22', '2026-09-23'],
};

describe('HabitCard', () => {
  test('renders name and Daily frequency label', () => {
    render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={vi.fn()} onToggleLog={vi.fn()} />);
    expect(screen.getByText('Stretch')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  test('shows a weekly frequency label with the count', () => {
    render(
      <HabitCard
        habit={{ ...habit, freqType: 'WEEKLY', timesPerWeek: 3 }}
        todayKey="2026-09-23"
        heatWeeks={4}
        selected={false}
        onSelect={vi.fn()}
        onToggleLog={vi.fn()}
      />
    );
    expect(screen.getByText('3x / week')).toBeInTheDocument();
  });

  test('shows the streak flame only when streak > 0', () => {
    const { rerender } = render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={vi.fn()} onToggleLog={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    rerender(<HabitCard habit={{ ...habit, logs: [] }} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={vi.fn()} onToggleLog={vi.fn()} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  test('checkbox reflects today logged and calls onToggleLog with today on click, without selecting the card', () => {
    const onToggleLog = vi.fn();
    const onSelect = vi.fn();
    render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={onSelect} onToggleLog={onToggleLog} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Stretch' });
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(checkbox);
    expect(onToggleLog).toHaveBeenCalledWith('h1', '2026-09-23');
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('clicking a past heatmap cell toggles that date', () => {
    const onToggleLog = vi.fn();
    render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={1} selected={false} onSelect={vi.fn()} onToggleLog={onToggleLog} />);
    const cell = screen.getByTitle('2026-09-21');
    fireEvent.click(cell);
    expect(onToggleLog).toHaveBeenCalledWith('h1', '2026-09-21');
  });

  test('clicking a future heatmap cell does not toggle it', () => {
    const onToggleLog = vi.fn();
    render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={1} selected={false} onSelect={vi.fn()} onToggleLog={onToggleLog} />);
    // heatWeeks=1 grids the current Sun-Sat week; 2026-09-23 is a Wednesday, so
    // the grid's final cell (Saturday 2026-09-26) is always a future date and,
    // per HabitCard, renders with no `title` attribute (unlike past/today cells).
    const gridDiv = screen.getByText('Today').parentElement!.previousElementSibling as HTMLElement;
    const futureCell = gridDiv.lastElementChild as HTMLElement;
    expect(futureCell).not.toHaveAttribute('title');
    fireEvent.click(futureCell);
    expect(onToggleLog).not.toHaveBeenCalled();
  });

  test('clicking the card itself calls onSelect', () => {
    const onSelect = vi.fn();
    render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={onSelect} onToggleLog={vi.fn()} />);
    fireEvent.click(screen.getByText('Stretch'));
    expect(onSelect).toHaveBeenCalled();
  });
});
