import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { TaskCard } from './task-card';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Buy milk',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    completedAt: null,
    reminderOffset: null,
    order: 0,
    ...overrides,
  };
}

describe('TaskCard', () => {
  test('renders the task text', () => {
    render(<TaskCard task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('strikes through and dims the text when done', () => {
    render(<TaskCard task={makeTask({ done: true })} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('Buy milk')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('renders a priority flag only when a priority is set', () => {
    const { rerender } = render(<TaskCard task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<TaskCard task={makeTask({ priority: 'RED' })} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Priority: red' })).toBeInTheDocument();
  });

  test('clicking the card calls onOpen with the task', async () => {
    const onOpen = vi.fn();
    const task = makeTask();
    render(<TaskCard task={task} onToggleDone={vi.fn()} onOpen={onOpen} />);
    await userEvent.click(screen.getByText('Buy milk'));
    expect(onOpen).toHaveBeenCalledWith(task);
  });

  test('toggling the checkbox calls onToggleDone but not onOpen', async () => {
    const onToggleDone = vi.fn();
    const onOpen = vi.fn();
    render(<TaskCard task={makeTask()} onToggleDone={onToggleDone} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggleDone).toHaveBeenCalledWith('t1');
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('renders a due date label when due is set', () => {
    render(<TaskCard task={makeTask({ due: '2026-03-01' })} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('03-01')).toBeInTheDocument();
  });
});
