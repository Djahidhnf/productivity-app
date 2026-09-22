import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MatrixBoard } from './matrix-board';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

vi.mock('../tasks/actions', () => ({
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
}));

import * as actions from '../tasks/actions';

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
    order: 0,
    ...overrides,
  };
}

const lists: TaskListDTO[] = [{ id: 'list1', name: 'Work', order: 0, tasks: [] }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MatrixBoard', () => {
  test('renders unflagged tasks in the Unflagged panel', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Unflagged')).toBeInTheDocument();
  });

  test('renders a flagged task in its quadrant', () => {
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' })]} lists={lists} />);
    expect(screen.getByText('Do first')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('dragging an unflagged task onto a quadrant calls updateTask with the new priority', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    const quadrant = screen.getByText('Do first').closest('[data-quad]')!;
    fireEvent.drop(quadrant);
    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', priority: 'RED' }));
  });

  test('dragging a flagged task onto the Unflagged panel clears its priority', () => {
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' })]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    const unflaggedPanel = screen.getByText('Unflagged').closest('[data-quad]')!;
    fireEvent.drop(unflaggedPanel);
    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', priority: null }));
  });

  test('toggling a task as done removes it from the matrix view optimistically', async () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(actions.toggleTaskDone).toHaveBeenCalledWith('t1');
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  test('clicking a task opens the edit dialog; saving calls updateTask and keeps it visible', async () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByText('Buy milk'));
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(actions.updateTask).toHaveBeenCalled();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('deleting from the dialog removes the task and calls deleteTask', async () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByText('Buy milk'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(actions.deleteTask).toHaveBeenCalledWith('t1');
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  test('an abandoned drag (dragend without a drop) clears drag state so a later drop is a no-op', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    act(() => {
      window.dispatchEvent(new Event('dragend'));
    });
    const quadrant = screen.getByText('Do first').closest('[data-quad]')!;
    fireEvent.drop(quadrant);
    expect(actions.updateTask).not.toHaveBeenCalled();
  });

  test('a failed drag-drop update reverts the optimistic move and alerts the user', async () => {
    vi.mocked(actions.updateTask).mockRejectedValueOnce(new Error('network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    const quadrant = screen.getByText('Do first').closest('[data-quad]')!;
    fireEvent.drop(quadrant);
    await waitFor(() => {
      expect(screen.getByText('Unflagged').closest('[data-quad]')).toContainElement(screen.getByText('Buy milk'));
    });
    expect(alertSpy).toHaveBeenCalled();
  });
});

describe('MatrixBoard mobile long-press drag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a long press (280ms) followed by a release over a quadrant sets the new priority', () => {
    const quadrantEl = document.createElement('div');
    quadrantEl.setAttribute('data-quad', 'RED');
    document.elementFromPoint = vi.fn().mockReturnValue(quadrantEl);

    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => {
      vi.advanceTimersByTime(280);
    });
    fireEvent.touchMove(card, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchEnd(card);

    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', priority: 'RED' }));
  });

  test('releasing before 280ms does not trigger a drag (acts as a normal tap)', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    vi.advanceTimersByTime(100);
    fireEvent.touchEnd(card);
    expect(actions.updateTask).not.toHaveBeenCalled();
  });

  test('moving more than 10px before 280ms cancels the long-press (treated as a scroll)', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchMove(card, { touches: [{ clientX: 30, clientY: 10 }] });
    vi.advanceTimersByTime(280);
    fireEvent.touchEnd(card);
    expect(actions.updateTask).not.toHaveBeenCalled();
  });

  test('calls navigator.vibrate when the long-press engages', () => {
    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true });
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => {
      vi.advanceTimersByTime(280);
    });
    expect(vibrateSpy).toHaveBeenCalledWith(10);
    fireEvent.touchEnd(card);
  });

  test('releasing over no valid target does not change the task', () => {
    document.elementFromPoint = vi.fn().mockReturnValue(null);
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => {
      vi.advanceTimersByTime(280);
    });
    fireEvent.touchMove(card, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchEnd(card);
    expect(actions.updateTask).not.toHaveBeenCalled();
  });
});
