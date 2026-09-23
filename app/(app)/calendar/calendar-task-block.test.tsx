import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CalendarTaskBlock } from './calendar-task-block';
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
    order: 0,
    ...overrides,
  };
}

describe('CalendarTaskBlock', () => {
  test('renders the task text', () => {
    render(<CalendarTaskBlock task={makeTask()} onOpen={vi.fn()} />);
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  test('positions itself using dueTime and duration', () => {
    render(<CalendarTaskBlock task={makeTask({ dueTime: 120, duration: 60 })} onOpen={vi.fn()} />);
    const block = screen.getByText('Standup').closest('div')!;
    expect(block).toHaveStyle({ top: '128px', height: '64px' }); // 120min=2h*64px, 60min=1h*64px
  });

  test('strikes through the text when done', () => {
    render(<CalendarTaskBlock task={makeTask({ done: true })} onOpen={vi.fn()} />);
    expect(screen.getByText('Standup')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('clicking calls onOpen with the task and does not bubble to a parent click handler', () => {
    const onOpen = vi.fn();
    const onParentClick = vi.fn();
    const task = makeTask();
    render(
      <div onClick={onParentClick}>
        <CalendarTaskBlock task={task} onOpen={onOpen} />
      </div>
    );
    fireEvent.click(screen.getByText('Standup'));
    expect(onOpen).toHaveBeenCalledWith(task);
    expect(onParentClick).not.toHaveBeenCalled();
  });

  test('toggling the checkbox calls onToggleDone but not onOpen', async () => {
    const onToggleDone = vi.fn();
    const onOpen = vi.fn();
    render(<CalendarTaskBlock task={makeTask()} onOpen={onOpen} onToggleDone={onToggleDone} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggleDone).toHaveBeenCalledWith('t1');
    expect(onOpen).not.toHaveBeenCalled();
  });
});
