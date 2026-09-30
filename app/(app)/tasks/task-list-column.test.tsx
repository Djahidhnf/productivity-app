import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { TaskListColumn } from './task-list-column';
import type { TaskDTO, TaskListDTO } from './queries';

function makeList(overrides: Partial<TaskListDTO> = {}): TaskListDTO {
  return {
    id: 'list1',
    name: 'Work',
    order: 0,
    tasks: [
      { id: 't1', text: 'Buy milk', listId: 'list1', priority: null, due: null, dueTime: null, duration: 60, done: false, completedAt: null, reminderOffset: null, order: 0 },
    ],
    ...overrides,
  };
}

function task(overrides: Partial<TaskDTO>): TaskDTO {
  return { id: 'x', text: 'x', listId: 'list1', priority: null, due: null, dueTime: null, duration: 60, done: false, completedAt: null, reminderOffset: null, order: 0, ...overrides };
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

  test('shows "Nothing here." when the list is empty', () => {
    render(<TaskListColumn list={makeList({ tasks: [] })} {...noop} />);
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  test('clicking the delete button calls onDeleteList with the list id', async () => {
    const onDeleteList = vi.fn();
    render(<TaskListColumn list={makeList()} {...noop} onDeleteList={onDeleteList} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete list' }));
    expect(onDeleteList).toHaveBeenCalledWith('list1');
  });

  test('typing in the add row and pressing Enter calls onQuickAdd and clears the row for the next task', async () => {
    const onQuickAdd = vi.fn();
    render(<TaskListColumn list={makeList()} {...noop} onQuickAdd={onQuickAdd} />);
    const input = screen.getByLabelText('Add a task to Work');
    await userEvent.type(input, 'New task{Enter}');
    expect(onQuickAdd).toHaveBeenCalledWith('list1', 'New task');
    expect(input).toHaveValue('');
  });

  test('pressing Enter on an empty add row does not call onQuickAdd', async () => {
    const onQuickAdd = vi.fn();
    render(<TaskListColumn list={makeList()} {...noop} onQuickAdd={onQuickAdd} />);
    await userEvent.type(screen.getByLabelText('Add a task to Work'), '   {Enter}');
    expect(onQuickAdd).not.toHaveBeenCalled();
  });

  test('Escape clears the add row without adding', async () => {
    const onQuickAdd = vi.fn();
    render(<TaskListColumn list={makeList()} {...noop} onQuickAdd={onQuickAdd} />);
    const input = screen.getByLabelText('Add a task to Work');
    await userEvent.type(input, 'Half a thought{Escape}');
    expect(onQuickAdd).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  test('hides the Completed toggle when no task is done', () => {
    render(<TaskListColumn list={makeList()} {...noop} />);
    expect(screen.queryByRole('button', { name: /Completed/ })).not.toBeInTheDocument();
  });

  test('done tasks are collapsed under a Completed toggle and the header counts open tasks only', () => {
    const list = makeList({
      tasks: [
        task({ id: 'a', text: 'Open one' }),
        task({ id: 'b', text: 'Finished one', done: true, completedAt: '2026-09-26T08:00:00.000Z' }),
      ],
    });
    render(<TaskListColumn list={list} {...noop} />);
    expect(screen.getByText('Open one')).toBeInTheDocument();
    expect(screen.queryByText('Finished one')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Completed (1)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('heading', { name: /Work/ })).toHaveTextContent('Work1');
  });

  test('expanding Completed lists done tasks newest-completed first', async () => {
    const list = makeList({
      tasks: [
        task({ id: 'old', text: 'Done Monday', done: true, completedAt: '2026-09-21T08:00:00.000Z' }),
        task({ id: 'new', text: 'Done Friday', done: true, completedAt: '2026-09-25T08:00:00.000Z' }),
      ],
    });
    render(<TaskListColumn list={list} {...noop} />);
    await userEvent.click(screen.getByRole('button', { name: 'Completed (2)' }));
    expect(screen.getByRole('button', { name: 'Completed (2)' })).toHaveAttribute('aria-expanded', 'true');
    const friday = screen.getByText('Done Friday');
    const monday = screen.getByText('Done Monday');
    expect(friday.compareDocumentPosition(monday) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('done tasks in the dropdown are not draggable', async () => {
    const list = makeList({ tasks: [task({ id: 'd', text: 'Finished', done: true, completedAt: '2026-09-26T08:00:00.000Z' })] });
    render(<TaskListColumn list={list} {...noop} />);
    await userEvent.click(screen.getByRole('button', { name: 'Completed (1)' }));
    expect(screen.getByText('Finished').closest('.st-row')).not.toHaveAttribute('draggable', 'true');
  });
});
