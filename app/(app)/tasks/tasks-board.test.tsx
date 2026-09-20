import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { TasksBoard } from './tasks-board';
import type { TaskListDTO } from './queries';

vi.mock('./actions', () => ({
  createList: vi.fn(async (name: string) => ({ id: 'newlist', name, order: 1 })),
  deleteList: vi.fn(async () => {}),
  reorderLists: vi.fn(async () => {}),
  createTask: vi.fn(async (input: { text: string; listId: string }) => ({
    id: 'newtask',
    text: input.text,
    listId: input.listId,
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 1,
  })),
  updateTask: vi.fn(async (input: { id: string; text: string; listId: string; priority: string | null; due: string | null; dueTime: number | null }) => ({
    id: input.id,
    text: input.text,
    listId: input.listId,
    priority: input.priority,
    due: input.due,
    dueTime: input.dueTime,
    duration: 60,
    done: false,
    order: 0,
  })),
  deleteTask: vi.fn(async () => {}),
  toggleTaskDone: vi.fn(async (id: string) => ({
    id,
    text: 'Buy milk',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: true,
    order: 0,
  })),
  reorderTasks: vi.fn(async () => {}),
}));

import * as actions from './actions';

function makeLists(): TaskListDTO[] {
  return [
    {
      id: 'list1',
      name: 'Work',
      order: 0,
      tasks: [
        { id: 't1', text: 'Buy milk', listId: 'list1', priority: null, due: null, dueTime: null, duration: 60, done: false, order: 0 },
      ],
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TasksBoard', () => {
  test('renders each list and its tasks', () => {
    render(<TasksBoard initialLists={makeLists()} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('quick-adding a task in a column calls createTask and shows the new task', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    await userEvent.type(screen.getByPlaceholderText('Task name, Enter to add…'), 'New task{Enter}');
    expect(actions.createTask).toHaveBeenCalledWith({ text: 'New task', listId: 'list1' });
    expect(await screen.findByText('New task')).toBeInTheDocument();
  });

  test('toggling a task calls toggleTaskDone optimistically', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(actions.toggleTaskDone).toHaveBeenCalledWith('t1');
    expect(screen.getByText('Buy milk')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('clicking a card opens the edit dialog; saving calls updateTask', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByText('Buy milk'));
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    const input = screen.getByLabelText('Task');
    await userEvent.clear(input);
    await userEvent.type(input, 'Buy oat milk');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(actions.updateTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', text: 'Buy oat milk', listId: 'list1' })
    );
  });

  test('deleting from the dialog calls deleteTask and closes the dialog', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByText('Buy milk'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(actions.deleteTask).toHaveBeenCalledWith('t1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('creating a new list calls createList and shows the new column', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.type(screen.getByPlaceholderText('New list…'), 'Home{Enter}');
    expect(actions.createList).toHaveBeenCalledWith('Home');
    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  test('an abandoned drag (dragend fired without a drop) clears drag state, so a later drop is a no-op', () => {
    render(<TasksBoard initialLists={makeLists()} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    act(() => {
      window.dispatchEvent(new Event('dragend'));
    });
    const column = screen.getByText('Work').closest('.pw-list-col') as HTMLElement;
    fireEvent.drop(column);
    expect(actions.reorderTasks).not.toHaveBeenCalled();
  });
});
