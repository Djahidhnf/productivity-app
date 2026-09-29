import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardBoard, type DashboardBoardProps } from './dashboard-board';
import * as habitActions from '../habits/actions';
import * as noteActions from '../notes/actions';
import type { TaskDTO } from '@/app/lib/task-dto';
import type { HabitDTO } from '@/app/lib/habit-dto';
import type { NoteDTO } from '@/app/lib/note-dto';

vi.mock('../tasks/actions', () => ({ createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(), toggleTaskDone: vi.fn() }));
vi.mock('../habits/actions', () => ({ toggleHabitLog: vi.fn() }));
vi.mock('../notes/actions', () => ({ createNote: vi.fn() }));

const TODAY = '2026-09-26';

function task(id: string, overrides: Partial<TaskDTO> = {}): TaskDTO {
  return { id, text: `Task ${id}`, listId: 'inbox', priority: null, due: TODAY, dueTime: null, duration: 60, done: false, completedAt: null, order: 0, ...overrides };
}

function habit(id: string, overrides: Partial<HabitDTO> = {}): HabitDTO {
  return { id, name: `Habit ${id}`, color: 'moss', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01', order: 0, logs: [], ...overrides };
}

function note(id: string, text: string): NoteDTO {
  return { id, text, pinned: false, createdAt: '2026-09-26T09:00:00.000Z', updatedAt: '2026-09-26T09:00:00.000Z' };
}

function setup(overrides: Partial<DashboardBoardProps> = {}) {
  return render(
    <DashboardBoard
      initialTasks={[]}
      lists={[{ id: 'inbox', name: 'Inbox', order: 0, tasks: [] }]}
      initialHabits={[]}
      initialNotes={[]}
      financeEntries={[]}
      {...overrides}
    />
  );
}

function section(name: RegExp) {
  return screen.getByRole('heading', { name }).closest('section')!;
}

async function flushPromises() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

describe('DashboardBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows the date and empty states', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText('Saturday, September 26')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Tasks/ })).not.toBeInTheDocument();
    expect(screen.getByText('Nothing scheduled.')).toBeInTheDocument();
    expect(screen.getByText('No habits yet.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'September so far' })).toBeInTheDocument();
  });

  test("lists today's timed tasks in time order, with their priority", () => {
    setup({
      initialTasks: [
        task('untimed'),
        task('later', { due: '2026-09-30', dueTime: 60 }),
        task('meeting', { dueTime: 14 * 60 + 30, done: true, priority: 'RED' }),
        task('standup', { dueTime: 9 * 60 }),
      ],
    });
    const schedule = section(/Schedule/);
    expect(within(schedule).getAllByText(/^Task /).map((el) => el.textContent)).toEqual(['Task standup', 'Task meeting']);
    expect(within(schedule).getByText('2:30PM')).toBeInTheDocument();
    expect(within(schedule).getAllByRole('img', { name: /Priority/ })).toHaveLength(1);
    expect(within(schedule).getByRole('img', { name: 'Priority: red' })).toBeInTheDocument();
  });

  test('clicking a scheduled task opens the edit dialog', () => {
    setup({ initialTasks: [task('a', { dueTime: 10 * 60 })] });
    fireEvent.click(screen.getByText('Task a'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Task')).toHaveValue('Task a');
  });

  test("habits toggle today's log and show progress", async () => {
    vi.mocked(habitActions.toggleHabitLog).mockResolvedValue(undefined);
    setup({ initialHabits: [habit('a', { logs: [TODAY] }), habit('b'), habit('future', { startDate: '2026-10-01' })] });
    const habits = section(/Habits/);
    expect(habits).toHaveTextContent('1/2');
    expect(within(habits).queryByText('Habit future')).not.toBeInTheDocument();
    fireEvent.click(within(habits).getByText('Habit b'));
    await flushPromises();
    expect(habitActions.toggleHabitLog).toHaveBeenCalledWith('b', TODAY);
    expect(habits).toHaveTextContent('2/2');
  });

  test('a quick note goes to the top of the recent notes', async () => {
    vi.mocked(noteActions.createNote).mockResolvedValue(note('new', 'Call mum'));
    setup({ initialNotes: [note('a', 'A'), note('b', 'B'), note('c', 'C')] });
    const input = screen.getByLabelText('Add a note');
    fireEvent.change(input, { target: { value: 'Call mum' } });
    fireEvent.submit(input.closest('form')!);
    await flushPromises();
    expect(noteActions.createNote).toHaveBeenCalledWith('Call mum');
    const rows = section(/Notes/).querySelectorAll('.pw-today-note .st-row-text');
    expect([...rows].map((r) => r.textContent)).toEqual(['Call mum', 'A', 'B']);
  });

  test("sums this month's finance entries", () => {
    setup({
      financeEntries: [
        { id: '1', type: 'INCOME', amount: 500000, category: 'Salary', note: '', date: '2026-09-01' },
        { id: '2', type: 'EXPENSE', amount: 700000, category: 'Housing', note: '', date: '2026-09-02' },
        { id: '3', type: 'EXPENSE', amount: 100, category: 'Fun', note: '', date: '2026-08-31' },
      ],
    });
    const fin = section(/so far/);
    expect(fin).toHaveTextContent(/Spent\s*7\s000\sDA/);
    expect(fin).toHaveTextContent(/Earned\s*5\s000\sDA/);
    expect(within(fin).getByText(/−2\s000\sDA/)).toHaveAttribute('data-negative');
  });
});
