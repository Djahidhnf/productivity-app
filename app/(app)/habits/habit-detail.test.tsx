import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { HabitDetail } from './habit-detail';
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

describe('HabitDetail', () => {
  test('renders name, freq label, and stat tiles', () => {
    render(
      <HabitDetail
        habit={habit}
        todayKey="2026-09-23"
        monthKey="2026-09-01"
        isNarrow={false}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleLog={vi.fn()}
        onMonthPrev={vi.fn()}
        onMonthNext={vi.fn()}
      />
    );
    expect(screen.getByText('Stretch')).toBeInTheDocument();
    expect(screen.getByText('Every day')).toBeInTheDocument();
    expect(screen.getByText('Day streak').previousElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Day streak')).toBeInTheDocument();
    expect(screen.getByText('Check-ins')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  test('shows the back button only when narrow, and calls onBack', () => {
    const onBack = vi.fn();
    const { rerender } = render(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow={false} onBack={onBack} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLog={vi.fn()} onMonthPrev={vi.fn()} onMonthNext={vi.fn()} />
    );
    expect(screen.queryByText('All habits')).not.toBeInTheDocument();
    rerender(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow onBack={onBack} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLog={vi.fn()} onMonthPrev={vi.fn()} onMonthNext={vi.fn()} />
    );
    fireEvent.click(screen.getByText('All habits'));
    expect(onBack).toHaveBeenCalled();
  });

  test('Edit and Delete icon buttons call their handlers', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow={false} onBack={vi.fn()} onEdit={onEdit} onDelete={onDelete} onToggleLog={vi.fn()} onMonthPrev={vi.fn()} onMonthNext={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Edit habit'));
    expect(onEdit).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Delete habit'));
    expect(onDelete).toHaveBeenCalled();
  });

  test('month picker shows the month label and calls prev/next', () => {
    const onMonthPrev = vi.fn();
    const onMonthNext = vi.fn();
    render(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow={false} onBack={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLog={vi.fn()} onMonthPrev={onMonthPrev} onMonthNext={onMonthNext} />
    );
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(onMonthPrev).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(onMonthNext).toHaveBeenCalled();
  });

  test('clicking a non-future day cell toggles that date; future cells are inert', () => {
    const onToggleLog = vi.fn();
    render(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow={false} onBack={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLog={onToggleLog} onMonthPrev={vi.fn()} onMonthNext={vi.fn()} />
    );
    fireEvent.click(screen.getByTitle('2026-09-10'));
    expect(onToggleLog).toHaveBeenCalledWith('2026-09-10');
    onToggleLog.mockClear();
    fireEvent.click(screen.getByTitle('2026-09-30'));
    expect(onToggleLog).not.toHaveBeenCalled();
  });
});
