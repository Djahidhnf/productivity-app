import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    completedAt: null,
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
    completedAt: null,
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
    completedAt: null,
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
    completedAt: null,
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

  test('clicking the date title goes back to today', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByText('Standup')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTitle('Back to today'));
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

  test('dragging out a range in the day grid opens the create dialog and saves that duration', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    const col = container.querySelector('[data-daykey]') as HTMLElement;
    col.getBoundingClientRect = () => ({ top: 0, left: 0, right: 100, bottom: 64 * 24, width: 100, height: 64 * 24, x: 0, y: 0, toJSON: () => ({}) });
    const at = (y: number) => ({ pointerId: 1, pointerType: 'mouse', button: 0, clientX: 50, clientY: y });
    fireEvent.pointerDown(col, at(9 * 64));
    fireEvent.pointerMove(col, at(10 * 64 + 40));
    fireEvent.pointerUp(col, at(10 * 64 + 40));
    expect(screen.getByRole('dialog', { name: 'New task' })).toBeInTheDocument();
    expect(screen.getByLabelText('Time')).toHaveValue('09:00');
    await userEvent.type(screen.getByLabelText('Task'), 'Deep work');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'newtask', dueTime: 540, duration: 105 }))
    );
  }, 10000);

  test('clicking a day in Month view switches to that day in Day view', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    await userEvent.click(container.querySelector('[data-datekey="2026-09-24"]') as HTMLElement);
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
  }, 10000);

  test('clicking a day header in Week view switches to Day view on that day', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    await userEvent.click(screen.getByRole('button', { name: /Open .* 24/ }));
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
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

describe('CalendarBoard swipe navigation', () => {
  // The grid is stubbed to 400px wide: 200px is a 50% (short) swipe, 300px a 75% (long) one.
  function swipeGrid(container: HTMLElement, dx: number) {
    const grid = container.querySelector('.pw-calgrid') as HTMLElement;
    Object.defineProperty(grid, 'clientWidth', { value: 400, configurable: true });
    const at = (x: number) => ({ pointerId: 1, pointerType: 'touch', clientX: x, clientY: 300 });
    fireEvent.pointerDown(grid, at(200));
    fireEvent.pointerMove(grid, at(200 + dx / 2));
    fireEvent.pointerMove(grid, at(200 + dx));
    fireEvent.pointerUp(grid, at(200 + dx));
  }

  test('Day: swiping left moves to tomorrow; swiping right moves back', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, -200);
    expect(await screen.findByText('Tomorrow')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400)); // let the slide-in finish
    swipeGrid(container, 200);
    await waitFor(() => expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument());
  }, 10000);

  test('Day: swiping right moves to yesterday', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, 200);
    expect(await screen.findByText('Yesterday')).toBeInTheDocument();
  }, 10000);

  test('Day: a long swipe also moves only 1 day', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, -300);
    expect(await screen.findByText('Tomorrow')).toBeInTheDocument();
  }, 10000);

  test('3-Day: a short swipe advances by 1 day', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: '3-Day' }));
    expect(screen.getByText('Sep 23 – Sep 25')).toBeInTheDocument();
    swipeGrid(container, -120);
    expect(await screen.findByText('Sep 24 – Sep 26')).toBeInTheDocument();
  }, 10000);

  test('3-Day: a long swipe advances by 3 days', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: '3-Day' }));
    swipeGrid(container, -300);
    expect(await screen.findByText('Sep 26 – Sep 28')).toBeInTheDocument();
  }, 10000);

  test('Week: opens as a rolling 7-day window starting at the anchor date', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    expect(screen.getByText('Sep 23 – Sep 29')).toBeInTheDocument();
  }, 10000);

  test('Week: a short swipe advances by 1 day', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    swipeGrid(container, -120);
    expect(await screen.findByText('Sep 24 – Sep 30')).toBeInTheDocument();
  }, 10000);

  test('Week: a long swipe advances by 7 days', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    swipeGrid(container, -300);
    expect(await screen.findByText('Sep 30 – Oct 6')).toBeInTheDocument();
  }, 10000);

  test('a short swipe below the threshold does not change the date', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, -20);
    expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument();
  }, 10000);
});

describe('CalendarBoard jump picker', () => {
  test('in Month view the title opens a picker that jumps to any month and year', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    await userEvent.click(screen.getByRole('button', { name: /September 2026/ }));
    const dialog = screen.getByRole('dialog', { name: 'Jump to date' });
    const year = within(dialog).getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2030');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Feb' }));
    expect(screen.getByRole('button', { name: /February 2030/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
  }, 10000);

  test('in Year view the picker jumps to a year', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Year' }));
    await userEvent.click(screen.getByRole('button', { name: '2026' }));
    const dialog = screen.getByRole('dialog', { name: 'Jump to date' });
    const year = within(dialog).getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2031');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('button', { name: '2031' })).toBeInTheDocument();
  }, 10000);

  test('in Day view the title is plain text', () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
  });
});

describe('CalendarBoard continuous Month view', () => {
  test('scrolling to another month updates the header title', async () => {
    const OCT_2026 = 2026 * 12 + 9;
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    expect(screen.getByRole('button', { name: /September 2026/ })).toBeInTheDocument();
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.unit === undefined) return { top: 0, bottom: 600, left: 0, right: 0, width: 0, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      const top = (Number(this.dataset.unit) - OCT_2026) * 500;
      return { top, bottom: top + 500, left: 0, right: 0, width: 0, height: 500, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    fireEvent.scroll(container.querySelector('.pw-monthscroll') as HTMLElement);
    spy.mockRestore();
    expect(await screen.findByRole('button', { name: /October 2026/ })).toBeInTheDocument();
  }, 10000);

  test('Next moves the title to the following month', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: /October 2026/ })).toBeInTheDocument();
  }, 10000);
});

describe('CalendarBoard continuous Year view', () => {
  test('scrolling to another year updates the header title', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Year' }));
    expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument();
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.unit === undefined) return { top: 0, bottom: 600, left: 0, right: 0, width: 0, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      const top = (Number(this.dataset.unit) - 2027) * 800;
      return { top, bottom: top + 800, left: 0, right: 0, width: 0, height: 800, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    fireEvent.scroll(container.querySelector('.pw-yearscroll') as HTMLElement);
    spy.mockRestore();
    expect(await screen.findByRole('button', { name: '2027' })).toBeInTheDocument();
  }, 10000);

  test('tapping a month in Year view opens the Month view for that month', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Year' }));
    const block = container.querySelector('section[data-unit="2026"]') as HTMLElement;
    await userEvent.click(within(block).getByText('March'));
    expect(screen.getByRole('tab', { name: 'Month' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /March 2026/ })).toBeInTheDocument();
  }, 10000);
});

describe('CalendarBoard range limits', () => {
  async function jumpMonth(yearText: string, monthLabel: string) {
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    await userEvent.click(screen.getByRole('button', { name: /September 2026/ }));
    const dialog = screen.getByRole('dialog', { name: 'Jump to date' });
    const year = within(dialog).getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, yearText);
    await userEvent.click(within(dialog).getByRole('button', { name: monthLabel }));
  }

  test('Month: Next does not move past December 2100', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await jumpMonth('2100', 'Dec');
    expect(screen.getByRole('button', { name: /December 2100/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: /December 2100/ })).toBeInTheDocument();
    expect(screen.queryByText(/January 2101/)).not.toBeInTheDocument();
  }, 10000);

  test('Month: Previous does not move before January 1900', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await jumpMonth('1900', 'Jan');
    expect(screen.getByRole('button', { name: /January 1900/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByRole('button', { name: /January 1900/ })).toBeInTheDocument();
    expect(screen.queryByText(/December 1899/)).not.toBeInTheDocument();
  }, 10000);

  test('Year: Next does not move past 2100', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Year' }));
    await userEvent.click(screen.getByRole('button', { name: '2026' }));
    const dialog = screen.getByRole('dialog', { name: 'Jump to date' });
    const year = within(dialog).getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2100');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('button', { name: '2100' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: '2100' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2101' })).not.toBeInTheDocument();
  }, 10000);
});
