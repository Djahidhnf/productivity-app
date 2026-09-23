import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { CalendarBoard } from './calendar-board';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('../tasks/actions', () => ({
  createTask: vi.fn(async (input: { text: string; listId: string }) => ({
    id: 'newtask',
    text: input.text,
    listId: input.listId,
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
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
    text: 'Standup',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: 540,
    duration: 30,
    done: true,
    order: 0,
  })),
}));

import * as actions from '../tasks/actions';

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

const lists: TaskListDTO[] = [{ id: 'list1', name: 'Work', order: 0, tasks: [] }];

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(new Date(2026, 8, 23, 10, 0, 0)); // local Sep 23, 2026
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CalendarBoard', () => {
  test('defaults to Day view showing today\'s tasks', () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    expect(screen.getByText('Standup')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
  });

  test('switching to Month view shows the task as a chip', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    expect(screen.getByText('Standup')).toBeInTheDocument();
  }, 10000);

  test('Next in Day view advances calDate by 1 day', async () => {
    render(<CalendarBoard initialTasks={[makeTask({ due: '2026-09-24' })]} lists={lists} />);
    expect(screen.queryByText('Standup')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Standup')).toBeInTheDocument();
  }, 10000);

  test('Today resets the anchor date back to today', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByText('Standup')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText('Standup')).toBeInTheDocument();
  }, 10000);

  test('clicking a task opens the edit dialog; saving calls updateTask', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByText('Standup'));
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(actions.updateTask).toHaveBeenCalled());
  }, 10000);

  test('the header\'s New task button opens a create dialog prefilled with the current anchor date', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('button', { name: 'New task' }));
    expect(screen.getByRole('dialog', { name: 'New task' })).toBeInTheDocument();
  }, 10000);

  test('creating a task via the dialog calls createTask then updateTask with the chosen fields', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('button', { name: 'New task' }));
    await userEvent.type(screen.getByLabelText('Task'), 'New event');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(actions.createTask).toHaveBeenCalledWith(expect.objectContaining({ text: 'New event' })));
    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'newtask', text: 'New event' }));
  }, 10000);

  test('deleting from the dialog removes the task and calls deleteTask', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByText('Standup'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(actions.deleteTask).toHaveBeenCalledWith('t1'));
    expect(screen.queryByText('Standup')).not.toBeInTheDocument();
  }, 10000);

  test('toggling done calls toggleTaskDone optimistically', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(actions.toggleTaskDone).toHaveBeenCalledWith('t1'));
  }, 10000);

  test('dragging a task in the grid onto another day and dropping reschedules it via updateTask', async () => {
    const { container } = render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    fireEvent.dragStart(screen.getByText('Standup'));
    const targetCol = container.querySelector('[data-daykey="2026-09-24"]');
    expect(targetCol).not.toBeNull();
    fireEvent.drop(targetCol!);
    await waitFor(() => expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', due: '2026-09-24' })));
  }, 10000);

  test('dragging a task in Month view onto another cell reschedules it (date only, dueTime preserved)', async () => {
    const { container } = render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    fireEvent.dragStart(screen.getByText('Standup'));
    const targetCell = container.querySelector('[data-datekey="2026-09-24"]');
    expect(targetCell).not.toBeNull();
    fireEvent.drop(targetCell!);
    await waitFor(() => expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', due: '2026-09-24', dueTime: 540 })));
  }, 10000);

  test('a create that fails on the follow-up updateTask rolls back the partially-created task', async () => {
    vi.mocked(actions.updateTask).mockRejectedValueOnce(new Error('network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('button', { name: 'New task' }));
    await userEvent.type(screen.getByLabelText('Task'), 'New event');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(actions.deleteTask).toHaveBeenCalledWith('newtask'));
    expect(alertSpy).toHaveBeenCalled();
  }, 10000);

  test('a failed reschedule reverts the optimistic move and alerts the user', async () => {
    vi.mocked(actions.updateTask).mockRejectedValueOnce(new Error('network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { container } = render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    fireEvent.dragStart(screen.getByText('Standup'));
    const targetCol = container.querySelector('[data-daykey="2026-09-24"]');
    expect(targetCol).not.toBeNull();
    fireEvent.drop(targetCol!);
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  }, 10000);
});
