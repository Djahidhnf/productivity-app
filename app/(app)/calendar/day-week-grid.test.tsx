import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
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
