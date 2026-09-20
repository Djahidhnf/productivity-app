import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { TaskListColumn } from './task-list-column';
import type { TaskListDTO } from './queries';

function makeList(overrides: Partial<TaskListDTO> = {}): TaskListDTO {
  return {
    id: 'list1',
    name: 'Work',
    order: 0,
    tasks: [
      { id: 't1', text: 'Buy milk', listId: 'list1', priority: null, due: null, dueTime: null, duration: 60, done: false, order: 0 },
    ],
    ...overrides,
  };
}

const noop = {
  onToggleDone: vi.fn(),
  onOpenTask: vi.fn(),
  onQuickAdd: vi.fn(),
  onDeleteList: vi.fn(),
  onTaskDragStart: vi.fn(),
  onTaskDrop: vi.fn(),
  onColumnDragStart: vi.fn(),
  onColumnDrop: vi.fn(),
};

describe('TaskListColumn', () => {
  test('renders the list name, task count, and each task', () => {
    render(<TaskListColumn list={makeList()} {...noop} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('shows "No tasks." when the list is empty', () => {
    render(<TaskListColumn list={makeList({ tasks: [] })} {...noop} />);
    expect(screen.getByText('No tasks.')).toBeInTheDocument();
  });

  test('clicking the delete button calls onDeleteList with the list id', async () => {
    const onDeleteList = vi.fn();
    render(<TaskListColumn list={makeList()} {...noop} onDeleteList={onDeleteList} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete list' }));
    expect(onDeleteList).toHaveBeenCalledWith('list1');
  });

  test('clicking add reveals a quick-add input; typing and pressing Enter calls onQuickAdd and hides it again', async () => {
    const onQuickAdd = vi.fn();
    render(<TaskListColumn list={makeList()} {...noop} onQuickAdd={onQuickAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    const input = screen.getByPlaceholderText('Task name, Enter to add…');
    await userEvent.type(input, 'New task{Enter}');
    expect(onQuickAdd).toHaveBeenCalledWith('list1', 'New task');
    expect(screen.queryByPlaceholderText('Task name, Enter to add…')).not.toBeInTheDocument();
  });

  test('blurring the quick-add input while empty cancels without calling onQuickAdd', async () => {
    const onQuickAdd = vi.fn();
    render(
      <div>
        <TaskListColumn list={makeList()} {...noop} onQuickAdd={onQuickAdd} />
        <button>elsewhere</button>
      </div>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(onQuickAdd).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Task name, Enter to add…')).not.toBeInTheDocument();
  });
});
