import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { MonthView } from './month-view';
import type { MonthCellData } from './calendar-views';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function makeCells(overrides: Partial<MonthCellData>[] = []): MonthCellData[] {
  const base: MonthCellData[] = Array.from({ length: 42 }, (_, i) => ({
    dateKey: `2026-09-${String((i % 30) + 1).padStart(2, '0')}`,
    inMonth: i >= 2 && i < 32,
    chips: [],
    moreCount: 0,
  }));
  overrides.forEach((o, i) => Object.assign(base[i], o));
  return base;
}

describe('MonthView', () => {
  test('renders 7 weekday labels and 42 cells', () => {
    const { container } = render(<MonthView cells={makeCells()} onCellClick={vi.fn()} onTaskOpen={vi.fn()} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    for (const w of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getByText(w)).toBeInTheDocument();
    }
    expect(container.querySelectorAll('[data-datekey]')).toHaveLength(42);
  });

  test('dims out-of-month cells', () => {
    const cells = makeCells([{ dateKey: '2026-08-30', inMonth: false }]);
    const { container } = render(<MonthView cells={cells} onCellClick={vi.fn()} onTaskOpen={vi.fn()} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    const cell = container.querySelector('[data-datekey="2026-08-30"]');
    expect(cell).toHaveStyle({ opacity: '0.45' });
  });

  test('renders up to 3 chips and a "+N more" label', () => {
    const chips = [makeTask({ id: 't1', text: 'A' }), makeTask({ id: 't2', text: 'B' }), makeTask({ id: 't3', text: 'C' })];
    const cells = makeCells([{ dateKey: '2026-09-10', chips, moreCount: 2 }]);
    render(<MonthView cells={cells} onCellClick={vi.fn()} onTaskOpen={vi.fn()} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  test('clicking an empty part of a cell calls onCellClick with its date', async () => {
    const onCellClick = vi.fn();
    const cells = makeCells();
    const { container } = render(<MonthView cells={cells} onCellClick={onCellClick} onTaskOpen={vi.fn()} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    const cell = container.querySelector('[data-datekey="2026-09-10"]') as HTMLElement;
    await userEvent.click(cell);
    expect(onCellClick).toHaveBeenCalledWith('2026-09-10');
  });

  test('clicking a chip calls onTaskOpen but not onCellClick', () => {
    const onCellClick = vi.fn();
    const onTaskOpen = vi.fn();
    const chip = makeTask({ id: 't1', text: 'A' });
    const cells = makeCells([{ dateKey: '2026-09-10', chips: [chip] }]);
    render(<MonthView cells={cells} onCellClick={onCellClick} onTaskOpen={onTaskOpen} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    fireEvent.click(screen.getByText('A'));
    expect(onTaskOpen).toHaveBeenCalledWith(chip);
    expect(onCellClick).not.toHaveBeenCalled();
  });

  test('dragging a chip onto another cell calls onTaskDragStart then onCellDrop for that cell (end-to-end, no pixel math involved)', () => {
    const onTaskDragStart = vi.fn();
    const onCellDrop = vi.fn();
    const chip = makeTask({ id: 't1', text: 'A' });
    const cells = makeCells([{ dateKey: '2026-09-10', chips: [chip] }]);
    const { container } = render(<MonthView cells={cells} onCellClick={vi.fn()} onTaskOpen={vi.fn()} onTaskDragStart={onTaskDragStart} onCellDrop={onCellDrop} />);
    fireEvent.dragStart(screen.getByText('A'));
    expect(onTaskDragStart).toHaveBeenCalledWith(chip);
    const targetCell = container.querySelector('[data-datekey="2026-09-15"]') as HTMLElement;
    fireEvent.drop(targetCell);
    expect(onCellDrop).toHaveBeenCalledWith('2026-09-15');
  });
});
