import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { DayWeekGrid } from './day-week-grid';
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

function noop() {}
function emptyList() {
  return [] as TaskDTO[];
}

describe('DayWeekGrid skeleton', () => {
  test('renders one day-header column per date key', () => {
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23', '2026-09-24', '2026-09-25']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    // Each date's day-of-month number should appear once in the header.
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  test('renders 24 hour separator lines regardless of visible day count', () => {
    const { container } = render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    expect(container.querySelectorAll('.pw-calgrid-hourline')).toHaveLength(24);
  });

  test('renders one grid column per date key, each tagged with its date', () => {
    const { container } = render(
      <DayWeekGrid
        dateKeys={['2026-09-23', '2026-09-24']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    const cols = container.querySelectorAll('[data-daykey]');
    expect(Array.from(cols).map((el) => el.getAttribute('data-daykey'))).toEqual(['2026-09-23', '2026-09-24']);
  });
});

describe('DayWeekGrid all-day shelf and timed blocks', () => {
  test('renders untimed tasks in the all-day shelf for their date', () => {
    const untimed = makeTask({ id: 'u1', text: 'Pay rent', dueTime: null });
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={(key) => (key === '2026-09-23' ? [untimed] : [])}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    expect(screen.getByText('Pay rent')).toBeInTheDocument();
    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  test('renders timed tasks as positioned blocks in their date column', () => {
    const timed = makeTask({ id: 't1', text: 'Standup', dueTime: 540 });
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={(key) => (key === '2026-09-23' ? [timed] : [])}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  test('clicking a task (timed or all-day) calls onTaskOpen with that task', () => {
    const onTaskOpen = vi.fn();
    const timed = makeTask({ id: 't1', text: 'Standup', dueTime: 540 });
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={(key) => (key === '2026-09-23' ? [timed] : [])}
        untimedTasksFor={emptyList}
        onTaskOpen={onTaskOpen}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    fireEvent.click(screen.getByText('Standup'));
    expect(onTaskOpen).toHaveBeenCalledWith(timed);
  });
});

describe('DayWeekGrid click-to-create and drag-to-reschedule', () => {
  test('clicking an empty part of the grid calls onGridClick with the day and a 30-min-snapped minute value', () => {
    const onGridClick = vi.fn();
    const { container } = render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={onGridClick}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    const col = container.querySelector('[data-daykey="2026-09-23"]') as HTMLElement;
    col.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100, left: 0, bottom: 100 + 64 * 24, right: 800, width: 800, height: 64 * 24, x: 0, y: 100, toJSON: () => {},
    });
    // Click at 2h10m into the grid -> snaps to 2h (120 minutes).
    fireEvent.click(col, { clientY: 100 + 64 * 2 + 10 });
    expect(onGridClick).toHaveBeenCalledWith('2026-09-23', 120);
  });

  test('clicking directly on a task block does not also trigger onGridClick (stopPropagation)', () => {
    const onGridClick = vi.fn();
    const onTaskOpen = vi.fn();
    const timed = makeTask({ id: 't1', text: 'Standup', dueTime: 540 });
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={(key) => (key === '2026-09-23' ? [timed] : [])}
        untimedTasksFor={emptyList}
        onTaskOpen={onTaskOpen}
        onGridClick={onGridClick}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    fireEvent.click(screen.getByText('Standup'));
    expect(onTaskOpen).toHaveBeenCalledWith(timed);
    expect(onGridClick).not.toHaveBeenCalled();
  });

  test('dragging a timed block and dropping on a column calls onTaskDragStart then onGridDrop for that column', () => {
    const onTaskDragStart = vi.fn();
    const onGridDrop = vi.fn();
    const timed = makeTask({ id: 't1', text: 'Standup', dueTime: 540 });
    const { container } = render(
      <DayWeekGrid
        dateKeys={['2026-09-23', '2026-09-24']}
        timedTasksFor={(key) => (key === '2026-09-23' ? [timed] : [])}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={onTaskDragStart}
        onGridDrop={onGridDrop}
      />
    );
    fireEvent.dragStart(screen.getByText('Standup'));
    expect(onTaskDragStart).toHaveBeenCalledWith(timed);

    const targetCol = container.querySelector('[data-daykey="2026-09-24"]') as HTMLElement;
    fireEvent.drop(targetCol);
    expect(onGridDrop).toHaveBeenCalledWith('2026-09-24', expect.any(Number));
  });
});

describe('DayWeekGrid swipe and density', () => {
  beforeEach(() => {
    // Reduced motion: swipe callbacks fire immediately instead of after the slide.
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderGrid(props: { dateKeys?: string[]; onSwipePrev?: () => void; onSwipeNext?: () => void }) {
    const { container } = render(
      <DayWeekGrid
        dateKeys={props.dateKeys ?? ['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
        onSwipePrev={props.onSwipePrev}
        onSwipeNext={props.onSwipeNext}
      />
    );
    const grid = container.querySelector('.pw-calgrid') as HTMLElement;
    Object.defineProperty(grid, 'clientWidth', { value: 400, configurable: true });
    return grid;
  }

  function swipe(grid: HTMLElement, dx: number) {
    const at = (x: number) => ({ pointerId: 1, pointerType: 'touch', clientX: x, clientY: 300 });
    fireEvent.pointerDown(grid, at(200));
    fireEvent.pointerMove(grid, at(200 + dx / 2));
    fireEvent.pointerMove(grid, at(200 + dx));
    fireEvent.pointerUp(grid, at(200 + dx));
  }

  test('swiping left calls onSwipeNext', () => {
    const onSwipeNext = vi.fn();
    const onSwipePrev = vi.fn();
    swipe(renderGrid({ onSwipeNext, onSwipePrev }), -200);
    expect(onSwipeNext).toHaveBeenCalledTimes(1);
    expect(onSwipePrev).not.toHaveBeenCalled();
  });

  test('swiping right calls onSwipePrev', () => {
    const onSwipeNext = vi.fn();
    const onSwipePrev = vi.fn();
    swipe(renderGrid({ onSwipeNext, onSwipePrev }), 200);
    expect(onSwipePrev).toHaveBeenCalledTimes(1);
    expect(onSwipeNext).not.toHaveBeenCalled();
  });

  test('a swipe under 60% of the width passes "short" to the callback', () => {
    const onSwipeNext = vi.fn();
    swipe(renderGrid({ onSwipeNext, onSwipePrev: vi.fn() }), -200);
    expect(onSwipeNext).toHaveBeenCalledWith('short');
  });

  test('a swipe of 60% or more passes "long" to the callback', () => {
    const onSwipePrev = vi.fn();
    swipe(renderGrid({ onSwipeNext: vi.fn(), onSwipePrev }), 300);
    expect(onSwipePrev).toHaveBeenCalledWith('long');
  });

  test('without swipe callbacks a swipe does nothing', () => {
    const grid = renderGrid({});
    swipe(grid, -200);
    expect(grid.style.getPropertyValue('--swipe-x')).toBe('');
  });

  test('a swipe does not fire onGridClick (the trailing click is swallowed)', () => {
    const onGridClick = vi.fn();
    const { container } = render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={onGridClick}
        onTaskDragStart={noop}
        onGridDrop={noop}
        onSwipeNext={vi.fn()}
        onSwipePrev={vi.fn()}
      />
    );
    const grid = container.querySelector('.pw-calgrid') as HTMLElement;
    Object.defineProperty(grid, 'clientWidth', { value: 400, configurable: true });
    swipe(grid, -200);
    fireEvent.click(container.querySelector('[data-daykey="2026-09-23"]') as HTMLElement);
    expect(onGridClick).not.toHaveBeenCalled();
  });

  test('marks grids showing more than 3 days as dense (week) and others as not', () => {
    const week = renderGrid({ dateKeys: ['1', '2', '3', '4', '5', '6', '7'].map((d) => `2026-09-2${d}`) });
    expect(week.getAttribute('data-dense')).toBe('true');
    cleanup();
    const day = renderGrid({});
    expect(day.getAttribute('data-dense')).toBe('false');
  });
});

describe('DayWeekGrid drag-to-create time blocks', () => {
  function renderGrid(overrides: Partial<React.ComponentProps<typeof DayWeekGrid>> = {}) {
    const props = {
      dateKeys: ['2026-09-23'],
      timedTasksFor: emptyList,
      untimedTasksFor: emptyList,
      onTaskOpen: noop,
      onGridClick: vi.fn(),
      onRangeSelect: vi.fn(),
      onTaskDragStart: noop,
      onGridDrop: noop,
      ...overrides,
    };
    const { container } = render(<DayWeekGrid {...props} />);
    const col = container.querySelector('[data-daykey="2026-09-23"]') as HTMLElement;
    // Column top at y=0, so clientY maps straight to minutes (64px per hour).
    col.getBoundingClientRect = () => ({ top: 0, left: 0, right: 100, bottom: 64 * 24, width: 100, height: 64 * 24, x: 0, y: 0, toJSON: () => ({}) });
    return { props, col, container };
  }

  const mouse = (y: number) => ({ pointerId: 1, pointerType: 'mouse', button: 0, clientX: 50, clientY: y });

  test('dragging down from 9:00 to 10:20 selects 9:00-10:30 and reports start + duration', () => {
    const { props, col } = renderGrid();
    fireEvent.pointerDown(col, mouse(9 * 64 + 2));
    fireEvent.pointerMove(col, mouse(9 * 64 + 40));
    fireEvent.pointerMove(col, mouse(10 * 64 + 20));
    expect(col.querySelector('.pw-calgrid-selection')).toHaveTextContent('9:00AM – 10:30AM');
    fireEvent.pointerUp(col, mouse(10 * 64 + 20));
    expect(props.onRangeSelect).toHaveBeenCalledWith('2026-09-23', 9 * 60, 90);
    expect(col.querySelector('.pw-calgrid-selection')).toBeNull();
    fireEvent.click(col, { clientY: 10 * 64 + 20 });
    expect(props.onGridClick).not.toHaveBeenCalled();
  });

  test('dragging upwards selects the range between the two slots', () => {
    const { props, col } = renderGrid();
    fireEvent.pointerDown(col, mouse(14 * 64 + 10));
    fireEvent.pointerMove(col, mouse(13 * 64 + 5));
    fireEvent.pointerUp(col, mouse(13 * 64 + 5));
    expect(props.onRangeSelect).toHaveBeenCalledWith('2026-09-23', 13 * 60, 75);
  });

  test('a plain click (no drag) still calls onGridClick and not onRangeSelect', () => {
    const { props, col } = renderGrid();
    fireEvent.pointerDown(col, mouse(9 * 64));
    fireEvent.pointerUp(col, mouse(9 * 64));
    fireEvent.click(col, { clientY: 9 * 64 });
    expect(props.onGridClick).toHaveBeenCalledWith('2026-09-23', 9 * 60);
    expect(props.onRangeSelect).not.toHaveBeenCalled();
  });

  test('pressing on an existing task block does not start a selection', () => {
    const { props, container } = renderGrid({
      timedTasksFor: () => [makeTask({ id: 'b1', text: 'Block', dueTime: 9 * 60 })],
    });
    const block = container.querySelector('.pw-cal-block') as HTMLElement;
    fireEvent.pointerDown(block, mouse(9 * 64 + 5));
    fireEvent.pointerMove(block, mouse(11 * 64));
    fireEvent.pointerUp(block, mouse(11 * 64));
    expect(props.onRangeSelect).not.toHaveBeenCalled();
  });

  test('a touch long-press then drag selects a range', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { props, col } = renderGrid();
      fireEvent.pointerDown(col, { pointerId: 2, pointerType: 'touch', clientX: 50, clientY: 8 * 64 });
      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(col.querySelector('.pw-calgrid-selection')).not.toBeNull();
      fireEvent.touchMove(document, { touches: [{ clientX: 50, clientY: 9 * 64 + 10 }] });
      fireEvent.touchEnd(document, { touches: [] });
      expect(props.onRangeSelect).toHaveBeenCalledWith('2026-09-23', 8 * 60, 75);
    } finally {
      vi.useRealTimers();
    }
  });

  test('a touch that moves before the long-press delay does not select', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { props, col } = renderGrid();
      fireEvent.pointerDown(col, { pointerId: 2, pointerType: 'touch', clientX: 50, clientY: 8 * 64 });
      fireEvent.pointerMove(col, { pointerId: 2, pointerType: 'touch', clientX: 50, clientY: 8 * 64 + 30 });
      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(col.querySelector('.pw-calgrid-selection')).toBeNull();
      expect(props.onRangeSelect).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('DayWeekGrid navigation', () => {
  test('clicking a day header in a multi-day view calls onDayOpen', () => {
    const onDayOpen = vi.fn();
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23', '2026-09-24', '2026-09-25']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
        onDayOpen={onDayOpen}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Open .* 24/ }));
    expect(onDayOpen).toHaveBeenCalledWith('2026-09-24');
  });

  test('neighbouring days are rendered (inert) only while sliding', () => {
    const { container } = render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
        onSwipeNext={vi.fn()}
      />
    );
    expect(container.querySelector('.pw-calgrid-panel')).toBeNull();
    const grid = container.querySelector('.pw-calgrid') as HTMLElement;
    fireEvent.pointerDown(grid, { pointerId: 1, pointerType: 'touch', clientX: 200, clientY: 300 });
    fireEvent.pointerMove(grid, { pointerId: 1, pointerType: 'touch', clientX: 150, clientY: 300 });
    expect(container.querySelectorAll('.pw-calgrid-body .pw-calgrid-panel')).toHaveLength(2);
    expect(screen.getAllByText('22').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-daykey]')).toHaveLength(1);
  });
});
