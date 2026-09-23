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
      />
    );
    fireEvent.click(screen.getByText('Standup'));
    expect(onTaskOpen).toHaveBeenCalledWith(timed);
  });
});
