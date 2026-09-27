import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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
        { id: 't1', text: 'Buy milk', listId: 'list1', priority: null, due: null, dueTime: null, duration: 60, done: false, completedAt: null, order: 0 },
        { id: 't2', text: 'Buy eggs', listId: 'list1', priority: null, due: null, dueTime: null, duration: 60, done: false, completedAt: null, order: 1 },
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
    expect(screen.getByRole('heading', { name: /Work/ })).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('quick-adding a task in a column calls createTask and shows the new task', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.type(screen.getByLabelText('Add a task to Work'), 'New task{Enter}');
    expect(actions.createTask).toHaveBeenCalledWith({ text: 'New task', listId: 'list1' });
    expect(await screen.findByText('New task')).toBeInTheDocument();
  });

  test('toggling a task calls toggleTaskDone optimistically', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Buy milk' }));
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
    await userEvent.type(screen.getByLabelText('New list name'), 'Home{Enter}');
    expect(actions.createList).toHaveBeenCalledWith('Home');
    expect(await screen.findByRole('heading', { name: /Home/ })).toBeInTheDocument();
  });

  test('an abandoned drag (dragend fired without a drop) clears drag state, so a later drop is a no-op', () => {
    render(<TasksBoard initialLists={makeLists()} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    act(() => {
      window.dispatchEvent(new Event('dragend'));
    });
    const column = screen.getByRole('heading', { name: /Work/ }).closest('.pw-list-col') as HTMLElement;
    fireEvent.drop(column);
    expect(actions.reorderTasks).not.toHaveBeenCalled();
  });

  test('a failed toggle reverts the optimistic update and alerts the user', async () => {
    vi.mocked(actions.toggleTaskDone).mockRejectedValueOnce(new Error('network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Buy milk' }));
    await waitFor(() => {
      expect(screen.getByText('Buy milk')).not.toHaveStyle({ textDecoration: 'line-through' });
    });
    expect(alertSpy).toHaveBeenCalled();
  });

  test('dragging a task onto another reorders them within the list', () => {
    render(<TasksBoard initialLists={makeLists()} />);
    const dragged = screen.getByText('Buy eggs').closest('div')!;
    const target = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(dragged);
    fireEvent.drop(target);
    expect(actions.reorderTasks).toHaveBeenCalledWith({ listId: 'list1', orderedTaskIds: ['t2', 't1'] });
  });

  test('dragging a task onto itself is a no-op (does not move it to the end)', () => {
    render(<TasksBoard initialLists={makeLists()} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    fireEvent.drop(card);
    expect(actions.reorderTasks).toHaveBeenCalledWith({ listId: 'list1', orderedTaskIds: ['t1', 't2'] });
  });
});

describe('TasksBoard list strip (phone)', () => {
  function twoLists(): TaskListDTO[] {
    return [
      ...makeLists(),
      { id: 'list2', name: 'Home', order: 1, tasks: [] },
    ];
  }

  test('shows a chip per list with its task count, the first one active', () => {
    render(<TasksBoard initialLists={twoLists()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Work2', 'Home0']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  test('tapping a chip scrolls its column into view', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { container } = render(<TasksBoard initialLists={twoLists()} />);
    scrollIntoView.mockClear();
    await userEvent.click(screen.getByRole('tab', { name: /Home/ }));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(container.querySelector('[data-list-col="list2"]'));
  });

  test('dragging a chip past its neighbour reorders the lists and saves the order', async () => {
    const { container } = render(<TasksBoard initialLists={twoLists()} />);
    const chips = Array.from(container.querySelectorAll<HTMLElement>('.pw-listtab[data-list-id]'));
    chips.forEach((chip, i) => {
      chip.getBoundingClientRect = () => ({ left: i * 100, right: i * 100 + 90, width: 90, top: 0, bottom: 30, height: 30, x: i * 100, y: 0, toJSON: () => ({}) });
    });
    const work = chips[0];
    fireEvent.pointerDown(work, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 45, clientY: 10 });
    fireEvent.pointerMove(work, { pointerId: 1, pointerType: 'mouse', clientX: 60, clientY: 10 });
    fireEvent.pointerMove(document, { pointerId: 1, pointerType: 'mouse', clientX: 170, clientY: 10 });
    expect(screen.getAllByRole('tab').map((t) => t.getAttribute('data-list-id'))).toEqual(['list2', 'list1']);
    fireEvent.pointerUp(document, { pointerId: 1, pointerType: 'mouse', clientX: 170, clientY: 10 });
    await waitFor(() => expect(actions.reorderLists).toHaveBeenCalledWith(['list2', 'list1']));
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings[0]).toMatch(/Home/);
  });
});

describe('TasksBoard grab-to-scroll (desktop)', () => {
  test('mouse-dragging empty board space scrolls it horizontally', () => {
    const { container } = render(<TasksBoard initialLists={makeLists()} />);
    const board = container.querySelector('.pw-board') as HTMLElement;
    board.scrollLeft = 100;
    fireEvent.pointerDown(board, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 300, clientY: 200 });
    fireEvent.pointerMove(board, { pointerId: 1, pointerType: 'mouse', clientX: 240, clientY: 200 });
    expect(board.scrollLeft).toBe(160);
    expect(board.dataset.grabbing).toBe('true');
    fireEvent.pointerUp(board, { pointerId: 1, pointerType: 'mouse', clientX: 240, clientY: 200 });
    expect(board.dataset.grabbing).toBeUndefined();
  });

  test('pressing on a draggable task card does not grab-scroll', () => {
    const { container } = render(<TasksBoard initialLists={makeLists()} />);
    const board = container.querySelector('.pw-board') as HTMLElement;
    board.scrollLeft = 100;
    const card = screen.getByText('Buy milk').closest('[draggable="true"]') as HTMLElement;
    fireEvent.pointerDown(card, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 300, clientY: 200 });
    fireEvent.pointerMove(board, { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 200 });
    expect(board.scrollLeft).toBe(100);
  });
});
