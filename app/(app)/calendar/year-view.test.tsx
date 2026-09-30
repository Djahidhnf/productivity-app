import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { YearView, type YearViewProps } from './year-view';
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
    completedAt: null,
    reminderOffset: null,
    order: 0,
    ...overrides,
  };
}

function makeProps(overrides: Partial<YearViewProps> = {}): YearViewProps {
  return {
    tasks: [],
    anchor: '2026-09-23',
    todayKey: '2026-09-23',
    onVisibleYearChange: vi.fn(),
    onMonthOpen: vi.fn(),
    onDayOpen: vi.fn(),
    ...overrides,
  };
}

const year = (container: HTMLElement, y: number) => container.querySelector(`section[data-unit="${y}"]`) as HTMLElement;

describe('YearView', () => {
  test('renders a heading per year: the anchor year plus 2 years either side', () => {
    render(<YearView {...makeProps()} />);
    for (const y of ['2024', '2025', '2026', '2027', '2028']) {
      expect(screen.getByRole('heading', { name: y })).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { name: '2023' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '2029' })).not.toBeInTheDocument();
  });

  test('each year block has 12 month cards with 42 day cells each', () => {
    const { container } = render(<YearView {...makeProps()} />);
    const block = year(container, 2026);
    expect(block.querySelectorAll('.pw-yearview-card')).toHaveLength(12);
    expect(within(block).getByText('January')).toBeInTheDocument();
    expect(within(block).getByText('December')).toBeInTheDocument();
    expect(block.querySelectorAll('[data-datekey]')).toHaveLength(504);
  });

  test('clicking anywhere on a month card opens that month', async () => {
    const props = makeProps();
    const { container } = render(<YearView {...props} />);
    await userEvent.click(year(container, 2027).querySelector('[data-month="4"] span') as HTMLElement);
    expect(props.onMonthOpen).toHaveBeenCalledWith(2027, 4);
  });

  test('clicking a day opens that day and not the month', async () => {
    const props = makeProps();
    const { container } = render(<YearView {...props} />);
    await userEvent.click(year(container, 2026).querySelector('[data-month="2"] [data-datekey="2026-03-14"]') as HTMLElement);
    expect(props.onDayOpen).toHaveBeenCalledWith('2026-03-14');
    expect(props.onMonthOpen).not.toHaveBeenCalled();
  });

  test('clicking a month label calls onMonthOpen with that year and month', async () => {
    const props = makeProps();
    const { container } = render(<YearView {...props} />);
    await userEvent.click(within(year(container, 2027)).getByText('March'));
    expect(props.onMonthOpen).toHaveBeenCalledWith(2027, 2);
  });

  test('day cells have no click or drag handlers (Year view has no create/drag)', () => {
    const { container } = render(<YearView {...makeProps({ tasks: [makeTask()] })} />);
    const cell = container.querySelector('[data-datekey="2026-09-01"]') as HTMLElement;
    expect(cell.getAttribute('draggable')).toBeNull();
  });

  test('a day with a task gets a colored dot; an empty day does not', () => {
    const { container } = render(<YearView {...makeProps({ tasks: [makeTask({ due: '2026-09-22', priority: 'RED' })] })} />);
    const busy = container.querySelector('section[data-unit="2026"] [data-datekey="2026-09-22"]') as HTMLElement;
    const empty = container.querySelector('section[data-unit="2026"] [data-datekey="2026-09-24"]') as HTMLElement;
    expect(busy.querySelector<HTMLElement>('[data-dot]')?.style.background).toBe('var(--prio-red)');
    expect(empty.querySelector('[data-dot]')).toBeNull();
  });

  test('uses the year-view grid classes so CSS can compact the cards on phones', () => {
    const { container } = render(<YearView {...makeProps()} />);
    expect(container.querySelectorAll('.pw-yearview')).toHaveLength(5);
    expect(container.querySelectorAll('.pw-yearview-label')).toHaveLength(60);
  });

  test('reports the year at the top of the view when scrolled', () => {
    const props = makeProps();
    const { container } = render(<YearView {...props} />);
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.unit === undefined) return { top: 0, bottom: 600, left: 0, right: 0, width: 0, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      const top = (Number(this.dataset.unit) - 2027) * 800; // 2027 starts at the top; 2026 ends there
      return { top, bottom: top + 800, left: 0, right: 0, width: 0, height: 800, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    fireEvent.scroll(container.querySelector('.pw-yearscroll') as HTMLElement);
    spy.mockRestore();
    expect(props.onVisibleYearChange).toHaveBeenCalledWith('2027-01-01');
  });
});
