import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { AgendaView } from './agenda-view';
import type { AgendaGroup } from './calendar-views';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Standup',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: 540,
    duration: 30,
    done: false,
    completedAt: null,
    order: 0,
    ...overrides,
  };
}

describe('AgendaView', () => {
  test('shows the empty state when there are no groups', () => {
    render(<AgendaView groups={[]} todayKey="2026-09-23" onTaskOpen={vi.fn()} />);
    expect(screen.getByText('Nothing scheduled in the next 60 days.')).toBeInTheDocument();
  });

  test('renders each group\'s date label and its items with time labels', () => {
    const groups: AgendaGroup[] = [
      { dateKey: '2026-09-23', items: [{ task: makeTask(), timeLabel: '9:00AM' }] },
    ];
    render(<AgendaView groups={groups} todayKey="2026-09-23" onTaskOpen={vi.fn()} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Standup')).toBeInTheDocument();
    expect(screen.getByText('9:00AM')).toBeInTheDocument();
  });

  test('shows a priority flag only for flagged tasks', () => {
    const groups: AgendaGroup[] = [
      {
        dateKey: '2026-09-23',
        items: [
          { task: makeTask({ id: 't1', priority: 'RED' }), timeLabel: '9:00AM' },
          { task: makeTask({ id: 't2', text: 'Unflagged', priority: null }), timeLabel: 'All day' },
        ],
      },
    ];
    render(<AgendaView groups={groups} todayKey="2026-09-23" onTaskOpen={vi.fn()} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  test('strikes through done tasks', () => {
    const groups: AgendaGroup[] = [{ dateKey: '2026-09-23', items: [{ task: makeTask({ done: true }), timeLabel: '9:00AM' }] }];
    render(<AgendaView groups={groups} todayKey="2026-09-23" onTaskOpen={vi.fn()} />);
    expect(screen.getByText('Standup')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('clicking a row calls onTaskOpen with that task', () => {
    const onTaskOpen = vi.fn();
    const task = makeTask();
    const groups: AgendaGroup[] = [{ dateKey: '2026-09-23', items: [{ task, timeLabel: '9:00AM' }] }];
    render(<AgendaView groups={groups} todayKey="2026-09-23" onTaskOpen={onTaskOpen} />);
    fireEvent.click(screen.getByText('Standup'));
    expect(onTaskOpen).toHaveBeenCalledWith(task);
  });
});
