import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { MonthView, type MonthViewProps } from './month-view';
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

function makeProps(overrides: Partial<MonthViewProps> = {}): MonthViewProps {
  return {
    tasks: [],
    anchor: '2026-09-23',
    todayKey: '2026-09-23',
    onVisibleMonthChange: vi.fn(),
    onCellClick: vi.fn(),
    onTaskOpen: vi.fn(),
    onTaskDragStart: vi.fn(),
    onCellDrop: vi.fn(),
    ...overrides,
  };
}

const SEP_2026 = 2026 * 12 + 8;

describe('MonthView', () => {
  test('renders a heading per month: the anchor month plus 6 months either side', () => {
    render(<MonthView {...makeProps()} />);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    expect(screen.getByText('March 2027')).toBeInTheDocument();
    expect(screen.queryByText('February 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('April 2027')).not.toBeInTheDocument();
  });

  test('renders one sticky weekday row, not one per month', () => {
    render(<MonthView {...makeProps()} />);
    for (const w of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getAllByText(w)).toHaveLength(1);
    }
  });

  test('each month block only contains its own days, with blank slots around them', () => {
    const { container } = render(<MonthView {...makeProps()} />);
    const sept = container.querySelector(`section[data-unit="${SEP_2026}"]`) as HTMLElement;
    expect(sept.querySelectorAll('[data-datekey]')).toHaveLength(30);
    expect(sept.querySelectorAll('.pw-monthblock-blank')).toHaveLength(5); // 5 rows x 7 slots - 30 days
    // No date appears twice across the whole scroll.
    const keys = Array.from(container.querySelectorAll('[data-datekey]')).map((el) => el.getAttribute('data-datekey'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('marks today', () => {
    const { container } = render(<MonthView {...makeProps()} />);
    expect(container.querySelector('[data-datekey="2026-09-23"]')).toHaveAttribute('data-today', 'true');
    expect(container.querySelector('[data-datekey="2026-09-24"]')).toHaveAttribute('data-today', 'false');
  });

  test('renders up to 3 chips and a "+N more" label', () => {
    const tasks = ['A', 'B', 'C', 'D', 'E'].map((text, i) => makeTask({ id: `t${i}`, text, due: '2026-09-10' }));
    render(<MonthView {...makeProps({ tasks })} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByText('D')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  test('clicking an empty part of a cell calls onCellClick with its date', async () => {
    const props = makeProps();
    const { container } = render(<MonthView {...props} />);
    await userEvent.click(container.querySelector('[data-datekey="2026-09-10"]') as HTMLElement);
    expect(props.onCellClick).toHaveBeenCalledWith('2026-09-10');
  });

  test('clicking a chip calls onTaskOpen but not onCellClick', () => {
    const chip = makeTask({ id: 't1', text: 'A', due: '2026-09-10' });
    const props = makeProps({ tasks: [chip] });
    render(<MonthView {...props} />);
    fireEvent.click(screen.getByText('A'));
    expect(props.onTaskOpen).toHaveBeenCalledWith(chip);
    expect(props.onCellClick).not.toHaveBeenCalled();
  });

  test('dragging a chip onto another cell calls onTaskDragStart then onCellDrop for that cell', () => {
    const chip = makeTask({ id: 't1', text: 'A', due: '2026-09-10' });
    const props = makeProps({ tasks: [chip] });
    const { container } = render(<MonthView {...props} />);
    fireEvent.dragStart(screen.getByText('A'));
    expect(props.onTaskDragStart).toHaveBeenCalledWith(chip);
    fireEvent.drop(container.querySelector('[data-datekey="2026-09-15"]') as HTMLElement);
    expect(props.onCellDrop).toHaveBeenCalledWith('2026-09-15');
  });

  test('reports the month at the top of the view when scrolled', () => {
    const OCT_2026 = 2026 * 12 + 9;
    const props = makeProps();
    const { container } = render(<MonthView {...props} />);
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.unit === undefined) return { top: 0, bottom: 600, left: 0, right: 0, width: 0, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      const top = (Number(this.dataset.unit) - OCT_2026) * 500; // October starts at the top; September ends there
      return { top, bottom: top + 500, left: 0, right: 0, width: 0, height: 500, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    fireEvent.scroll(container.querySelector('.pw-monthscroll') as HTMLElement);
    spy.mockRestore();
    expect(props.onVisibleMonthChange).toHaveBeenCalledWith('2026-10-01');
  });
});
