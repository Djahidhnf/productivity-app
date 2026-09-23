import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { YearView, type YearMonthData } from './year-view';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: 'RED',
    due: '2026-09-23',
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function makeMonths(): YearMonthData[] {
  return Array.from({ length: 12 }, (_, m) => ({
    year: 2026,
    month: m,
    label: new Date(2026, m, 1).toLocaleDateString('en-US', { month: 'long' }),
    days: Array.from({ length: 35 }, (_, i) => ({
      dateKey: `2026-${String(m + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      dayNum: String((i % 28) + 1),
      inMonth: i < 28,
    })),
  }));
}

describe('YearView', () => {
  test('renders a label for each of the 12 months', () => {
    render(<YearView months={makeMonths()} tasksByDate={() => []} onMonthOpen={vi.fn()} todayKey="2026-09-23" />);
    expect(screen.getByText('January')).toBeInTheDocument();
    expect(screen.getByText('December')).toBeInTheDocument();
  });

  test('clicking a month label calls onMonthOpen with that year and month', async () => {
    const onMonthOpen = vi.fn();
    render(<YearView months={makeMonths()} tasksByDate={() => []} onMonthOpen={onMonthOpen} todayKey="2026-09-23" />);
    await userEvent.click(screen.getByText('March'));
    expect(onMonthOpen).toHaveBeenCalledWith(2026, 2);
  });

  test('renders 35 day cells per month card', () => {
    const { container } = render(<YearView months={makeMonths()} tasksByDate={() => []} onMonthOpen={vi.fn()} todayKey="2026-09-23" />);
    // 12 months * 35 days = 420 day cells, each with a data-datekey attribute.
    expect(container.querySelectorAll('[data-datekey]')).toHaveLength(420);
  });

  test('day cells have no click or drag handlers (Year view has no create/drag)', () => {
    const { container } = render(<YearView months={makeMonths()} tasksByDate={() => [makeTask()]} onMonthOpen={vi.fn()} todayKey="2026-09-23" />);
    const cell = container.querySelector('[data-datekey="2026-09-01"]') as HTMLElement;
    // A span with no onClick/onDrop/draggable — verify no draggable attribute is present.
    expect(cell.getAttribute('draggable')).toBeNull();
  });
});
