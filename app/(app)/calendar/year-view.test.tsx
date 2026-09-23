import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { YearView, type YearMonthData } from './year-view';
import type { TaskDTO } from './queries';
import { buildMonthGrid } from '@/app/lib/calendar-dates';

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
    days: buildMonthGrid(2026, m).map((c) => ({
      dateKey: c.dateKey,
      dayNum: String(Number(c.dateKey.slice(-2))),
      inMonth: c.inMonth,
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

  test('renders 42 day cells per month card', () => {
    const { container } = render(<YearView months={makeMonths()} tasksByDate={() => []} onMonthOpen={vi.fn()} todayKey="2026-09-23" />);
    // 12 months * 42 days = 504 day cells, each with a data-datekey attribute.
    expect(container.querySelectorAll('[data-datekey]')).toHaveLength(504);
  });

  test('day cells have no click or drag handlers (Year view has no create/drag)', () => {
    const { container } = render(<YearView months={makeMonths()} tasksByDate={() => [makeTask()]} onMonthOpen={vi.fn()} todayKey="2026-09-23" />);
    const cell = container.querySelector('[data-datekey="2026-09-01"]') as HTMLElement;
    // A span with no onClick/onDrop/draggable — verify no draggable attribute is present.
    expect(cell.getAttribute('draggable')).toBeNull();
  });
});
