import { render, screen, fireEvent, createEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MatrixBoard } from './matrix-board';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';
import { TASK_LONG_PRESS_MS } from '../tasks/use-touch-task-drag';

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
    completedAt: null,
    order: 0,
  })),
  deleteTask: vi.fn(async () => {}),
  placeMatrixTask: vi.fn(async () => {}),
  toggleTaskDone: vi.fn(async (id: string) => ({
    id,
    text: 'Buy milk',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: true,
    completedAt: null,
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
    completedAt: null,
    order: 0,
    ...overrides,
  };
}

const lists: TaskListDTO[] = [{ id: 'list1', name: 'Work', order: 0, tasks: [] }];

function stubMatchMedia(matches: boolean) {
  const mockMql = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mockMql));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Mock matchMedia as wide by default for existing tests
  stubMatchMedia(false);
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
    const card = screen.getByText('Buy milk').closest('[data-task-id]')!;
    fireEvent.dragStart(card);
    const quadrant = screen.getByText('Do first').closest('[data-quad]')!;
    fireEvent.drop(quadrant);
    expect(actions.placeMatrixTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 't1', priority: 'RED' }));
  });

  test('dragging a flagged task onto the Unflagged panel clears its priority', () => {
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' })]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('[data-task-id]')!;
    fireEvent.dragStart(card);
    const unflaggedPanel = screen.getByText('Unflagged').closest('[data-quad]')!;
    fireEvent.drop(unflaggedPanel);
    expect(actions.placeMatrixTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 't1', priority: null }));
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
    const card = screen.getByText('Buy milk').closest('[data-task-id]')!;
    fireEvent.dragStart(card);
    act(() => {
      window.dispatchEvent(new Event('dragend'));
    });
    const quadrant = screen.getByText('Do first').closest('[data-quad]')!;
    fireEvent.drop(quadrant);
    expect(actions.placeMatrixTask).not.toHaveBeenCalled();
  });

  test('a failed drag-drop update reverts the optimistic move and alerts the user', async () => {
    vi.mocked(actions.placeMatrixTask).mockRejectedValueOnce(new Error('network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('[data-task-id]')!;
    fireEvent.dragStart(card);
    const quadrant = screen.getByText('Do first').closest('[data-quad]')!;
    fireEvent.drop(quadrant);
    await waitFor(() => {
      expect(screen.getByText('Unflagged').closest('[data-quad]')).toContainElement(screen.getByText('Buy milk'));
    });
    expect(alertSpy).toHaveBeenCalled();
  });
});

/** A touch at a point, dispatched at the document the way the long-press gesture listens for it. */
function touch(type: 'touchMove' | 'touchEnd', x: number, y: number) {
  const touches = type === 'touchEnd' ? [] : [{ clientX: x, clientY: y }];
  fireEvent[type](document, { touches, changedTouches: [{ clientX: x, clientY: y }] });
}

function quadAt(quad: string) {
  const el = document.createElement('div');
  el.setAttribute('data-quad', quad);
  document.elementFromPoint = vi.fn().mockReturnValue(el);
}

/** Long-presses a row until the preview opens. */
function longPress(row: Element) {
  fireEvent.touchStart(row, { touches: [{ clientX: 10, clientY: 10 }] });
  act(() => {
    vi.advanceTimersByTime(TASK_LONG_PRESS_MS);
  });
}

function rowOf(text: string) {
  return screen.getByText(text).closest('[data-task-id]')!;
}

describe('MatrixBoard touch long-press', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a long press shows a preview with the full task text; releasing keeps it until a tap', () => {
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' })]} lists={lists} />);
    longPress(rowOf('Buy milk'));
    const preview = screen.getByRole('dialog', { name: 'Task preview' });
    expect(preview).toHaveTextContent('Buy milk');
    expect(preview).toHaveTextContent('Work');
    expect(preview).toHaveTextContent('Do first');
    touch('touchEnd', 10, 10);
    // The click synthesized by the release neither closes the preview nor opens the task...
    fireEvent.click(preview);
    expect(screen.getByRole('dialog', { name: 'Task preview' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    // ...but a later tap closes it.
    fireEvent.click(preview);
    expect(screen.queryByRole('dialog', { name: 'Task preview' })).not.toBeInTheDocument();
    expect(actions.placeMatrixTask).not.toHaveBeenCalled();
  });

  test('holding and moving drags the task: releasing over a quadrant sets the new priority', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    quadAt('RED');
    longPress(rowOf('Buy milk'));
    act(() => touch('touchMove', 10, 60));
    expect(screen.queryByRole('dialog', { name: 'Task preview' })).not.toBeInTheDocument();
    expect(rowOf('Buy milk')).toHaveAttribute('data-lifted');
    act(() => touch('touchEnd', 10, 60));
    expect(actions.placeMatrixTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 't1', priority: 'RED' }));
  });

  test('releasing early is a normal tap: no preview, no drag', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    fireEvent.touchStart(rowOf('Buy milk'), { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    touch('touchEnd', 10, 10);
    act(() => {
      vi.advanceTimersByTime(TASK_LONG_PRESS_MS);
    });
    expect(screen.queryByRole('dialog', { name: 'Task preview' })).not.toBeInTheDocument();
    expect(actions.placeMatrixTask).not.toHaveBeenCalled();
  });

  test('moving before the long press fires is a scroll: no preview, no drag', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    fireEvent.touchStart(rowOf('Buy milk'), { touches: [{ clientX: 10, clientY: 10 }] });
    touch('touchMove', 10, 60);
    act(() => {
      vi.advanceTimersByTime(TASK_LONG_PRESS_MS);
    });
    touch('touchEnd', 10, 60);
    expect(screen.queryByRole('dialog', { name: 'Task preview' })).not.toBeInTheDocument();
    expect(actions.placeMatrixTask).not.toHaveBeenCalled();
  });

  test('calls navigator.vibrate when the long press engages', () => {
    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true });
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    longPress(rowOf('Buy milk'));
    expect(vibrateSpy).toHaveBeenCalledWith(10);
    touch('touchEnd', 10, 10);
  });

  test('releasing over no valid target does not change the task', () => {
    document.elementFromPoint = vi.fn().mockReturnValue(null);
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    longPress(rowOf('Buy milk'));
    act(() => touch('touchMove', 10, 60));
    act(() => touch('touchEnd', 10, 60));
    expect(actions.placeMatrixTask).not.toHaveBeenCalled();
  });

  test('a click on a different task right after a completed touch-drag does not open its edit dialog', () => {
    render(<MatrixBoard initialTasks={[makeTask(), makeTask({ id: 't2', text: 'Buy eggs' })]} lists={lists} />);
    quadAt('RED');
    longPress(rowOf('Buy milk'));
    act(() => touch('touchMove', 10, 60));
    act(() => touch('touchEnd', 10, 60));
    expect(actions.placeMatrixTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 't1', priority: 'RED' }));

    // A synthesized click landing on a different row right after the drag
    // completed must not pop open that row's edit dialog.
    fireEvent.click(screen.getByText('Buy eggs'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('MatrixBoard responsive tabs', () => {
  function mockNarrow(matches: boolean) {
    stubMatchMedia(matches);
  }

  afterEach(() => {
    // Restore to wide state (matches: false) for other tests
    stubMatchMedia(false);
  });

  test('shows both panels with no tab switcher when wide', () => {
    mockNarrow(false);
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' }), makeTask({ id: 't2', text: 'Buy eggs' })]} lists={lists} />);
    expect(screen.getByText('Do first')).toBeInTheDocument();
    expect(screen.getByText('Unflagged')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  test('shows only the Matrix tab content by default when narrow', () => {
    mockNarrow(true);
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' }), makeTask({ id: 't2', text: 'Buy eggs' })]} lists={lists} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByText('Do first')).toBeInTheDocument();
    expect(screen.queryByText('Unflagged')).not.toBeInTheDocument();
  });

  test('switching to the Unflagged tab shows the unflagged panel instead', async () => {
    mockNarrow(true);
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' }), makeTask({ id: 't2', text: 'Buy eggs' })]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: /Unflagged/ }));
    expect(screen.getByText('Unflagged')).toBeInTheDocument();
    expect(screen.queryByText('Do first')).not.toBeInTheDocument();
  });

  test('a touch-drag on the Matrix tab keeps the Unflagged list hidden', () => {
    vi.useFakeTimers();
    try {
      mockNarrow(true);
      render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' }), makeTask({ id: 't2', text: 'Buy eggs' })]} lists={lists} />);
      quadAt('GREEN');
      longPress(rowOf('Buy milk'));
      expect(screen.queryByText('Unflagged')).not.toBeInTheDocument();
      act(() => touch('touchMove', 10, 60));
      expect(screen.getByText('Do first')).toBeInTheDocument();
      expect(screen.queryByText('Unflagged')).not.toBeInTheDocument();
      act(() => touch('touchEnd', 10, 60));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('MatrixBoard reordering and phone flag menu', () => {
  // jsdom's DragEvent ignores clientY in its init dict, so set it by hand.
  function dragAt(kind: 'dragOver' | 'drop', el: Element, clientY: number) {
    const event = createEvent[kind](el);
    Object.defineProperty(event, 'clientY', { value: clientY });
    fireEvent(el, event);
  }

  function rowRect(el: Element, top: number) {
    (el as HTMLElement).getBoundingClientRect = () => ({ top, bottom: top + 40, height: 40, left: 0, right: 200, width: 200, x: 0, y: top, toJSON: () => ({}) });
  }

  test('dropping a task on the upper half of another row in the same quadrant moves it before that row', () => {
    render(
      <MatrixBoard
        initialTasks={[makeTask({ id: 'a', text: 'Alpha', priority: 'RED' }), makeTask({ id: 'b', text: 'Beta', priority: 'RED' })]}
        lists={lists}
      />
    );
    const alpha = screen.getByText('Alpha').closest('[data-task-id]')!;
    const beta = screen.getByText('Beta').closest('[data-task-id]')!;
    rowRect(alpha, 0);
    rowRect(beta, 50);
    fireEvent.dragStart(beta);
    dragAt('dragOver', alpha, 10);
    expect(alpha).toHaveAttribute('data-drop-before', 'true');
    dragAt('drop', alpha, 10);
    expect(actions.placeMatrixTask).toHaveBeenCalledWith({ taskId: 'b', priority: 'RED', orderedTaskIds: ['b', 'a'] });
    const rows = screen.getByText('Do first').closest('[data-quad]')!.querySelectorAll('[data-task-id]');
    expect(Array.from(rows).map((r) => r.getAttribute('data-task-id'))).toEqual(['b', 'a']);
  });

  test('dropping on the lower half of a row in another group inserts after it, with that priority', () => {
    render(
      <MatrixBoard
        initialTasks={[
          makeTask({ id: 'a', text: 'Alpha', priority: 'AMBER' }),
          makeTask({ id: 'c', text: 'Gamma', priority: 'AMBER' }),
          makeTask({ id: 'u', text: 'Loose' }),
        ]}
        lists={lists}
      />
    );
    const alpha = screen.getByText('Alpha').closest('[data-task-id]')!;
    rowRect(alpha, 0);
    fireEvent.dragStart(screen.getByText('Loose').closest('[data-task-id]')!);
    dragAt('drop', alpha, 30);
    expect(actions.placeMatrixTask).toHaveBeenCalledWith({ taskId: 'u', priority: 'AMBER', orderedTaskIds: ['a', 'u', 'c'] });
  });

  test('on phones each unflagged task has a flag button that moves it into the chosen quadrant', async () => {
    stubMatchMedia(true);
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: /Unflagged/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Set priority' }));
    await userEvent.click(screen.getByRole('button', { name: /Schedule/ }));
    expect(actions.placeMatrixTask).toHaveBeenCalledWith({ taskId: 't1', priority: 'AMBER', orderedTaskIds: ['t1'] });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('on wide screens unflagged tasks have no flag button', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    expect(screen.queryByRole('button', { name: 'Set priority' })).not.toBeInTheDocument();
  });
});

describe('MatrixBoard phone rules', () => {
  afterEach(() => {
    vi.useRealTimers();
    stubMatchMedia(false);
  });

  test('on phones unflagged tasks cannot be dragged, but a long press still previews them', async () => {
    stubMatchMedia(true);
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: /Unflagged/ }));
    const card = rowOf('Buy milk');
    expect(card).toHaveAttribute('draggable', 'false');
    vi.useFakeTimers();
    quadAt('RED');
    longPress(card);
    expect(screen.getByRole('dialog', { name: 'Task preview' })).toHaveTextContent('Buy milk');
    act(() => touch('touchMove', 10, 60));
    expect(card).not.toHaveAttribute('data-lifted');
    act(() => touch('touchEnd', 10, 60));
    expect(actions.placeMatrixTask).not.toHaveBeenCalled();
  });

  test('on phones flagged tasks can still be long-press dragged', () => {
    stubMatchMedia(true);
    vi.useFakeTimers();
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' })]} lists={lists} />);
    quadAt('GREEN');
    longPress(rowOf('Buy milk'));
    act(() => touch('touchMove', 10, 60));
    act(() => touch('touchEnd', 10, 60));
    expect(actions.placeMatrixTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 't1', priority: 'GREEN' }));
  });

  test("the header reads Eisenhower's Matrix and a task's due date sits under its text", () => {
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED', due: '2026-03-01' })]} lists={lists} />);
    expect(screen.getByRole('heading', { level: 1, name: "Eisenhower's Matrix" })).toBeInTheDocument();
    const due = screen.getByText('03-01');
    expect(due).toHaveClass('pw-mrow-due');
    expect(due.parentElement).toContainElement(screen.getByText('Buy milk'));
  });
});
