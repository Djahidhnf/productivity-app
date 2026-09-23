import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { HabitsBoard } from './habits-board';
import type { HabitDTO } from './queries';
import * as actions from './actions';

vi.mock('./actions', () => ({
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  reorderHabits: vi.fn(),
  toggleHabitLog: vi.fn(),
}));

function makeHabit(overrides: Partial<HabitDTO> = {}): HabitDTO {
  return {
    id: 'h1',
    name: 'Stretch',
    color: '#c6ff34',
    freqType: 'DAILY',
    timesPerWeek: null,
    startDate: '2026-08-01',
    order: 0,
    logs: [],
    ...overrides,
  };
}

// jsdom does not implement matchMedia; HabitsBoard calls useMediaQuery
// directly (unlike the Task 6/7 components, which only receive isNarrow as
// a prop), so it needs the same stub already used in matrix-board.test.tsx
// and calendar-board.test.tsx for the identical '(max-width: 860px)' hook.
function stubMatchMedia(matches: boolean) {
  const mockMql = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mockMql));
}

describe('HabitsBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    window.confirm = vi.fn(() => true);
    stubMatchMedia(false);
  });

  test('renders the empty state when there are no habits', () => {
    render(<HabitsBoard initialHabits={[]} />);
    expect(screen.getByText('No habits yet — add one to start tracking.')).toBeInTheDocument();
  });

  test('auto-selects the first habit and shows its detail panel', () => {
    render(<HabitsBoard initialHabits={[makeHabit({ id: 'a', name: 'A' }), makeHabit({ id: 'b', name: 'B' })]} />);
    expect(screen.getAllByText('A')).not.toHaveLength(0);
    // Detail panel renders the stat-tile labels only once a habit is selected.
    expect(screen.getByText('Day streak')).toBeInTheDocument();
  });

  test('opening the New habit dialog and saving calls createHabit and adds it to the list', async () => {
    vi.mocked(actions.createHabit).mockResolvedValue(makeHabit({ id: 'new', name: 'Read', logs: [] }));
    render(<HabitsBoard initialHabits={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'New habit' }));
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Read' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    await waitFor(() => expect(actions.createHabit).toHaveBeenCalled());
    expect(await screen.findAllByText('Read')).not.toHaveLength(0);
  });

  test('keeps the dialog open with the typed values when createHabit fails', async () => {
    vi.mocked(actions.createHabit).mockRejectedValue(new Error('boom'));
    render(<HabitsBoard initialHabits={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'New habit' }));
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Read' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(screen.getByLabelText('Habit name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save habit' })).toBeInTheDocument();
  });

  test('editing via the detail panel calls updateHabit and reflects the new name', async () => {
    const habit = makeHabit();
    vi.mocked(actions.updateHabit).mockResolvedValue({ ...habit, name: 'Stretch v2' });
    render(<HabitsBoard initialHabits={[habit]} />);
    fireEvent.click(screen.getByLabelText('Edit habit'));
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Stretch v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    await waitFor(() => expect(actions.updateHabit).toHaveBeenCalled());
    expect(await screen.findAllByText('Stretch v2')).not.toHaveLength(0);
  });

  test('deleting the selected habit via the detail trash icon removes it and re-selects the next one', async () => {
    vi.mocked(actions.deleteHabit).mockResolvedValue(undefined);
    render(<HabitsBoard initialHabits={[makeHabit({ id: 'a', name: 'A' }), makeHabit({ id: 'b', name: 'B' })]} />);
    fireEvent.click(screen.getByLabelText('Delete habit'));
    await waitFor(() => expect(actions.deleteHabit).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(screen.queryAllByText('A')).toHaveLength(0));
    expect(screen.getAllByText('B').length).toBeGreaterThan(0);
  });

  test('does not delete when window.confirm returns false', async () => {
    window.confirm = vi.fn(() => false);
    render(<HabitsBoard initialHabits={[makeHabit({ id: 'a', name: 'A' }), makeHabit({ id: 'b', name: 'B' })]} />);
    fireEvent.click(screen.getByLabelText('Delete habit'));
    expect(window.confirm).toHaveBeenCalled();
    expect(actions.deleteHabit).not.toHaveBeenCalled();
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
  });

  test('toggling a log optimistically updates, then reverts and alerts on failure', async () => {
    vi.mocked(actions.toggleHabitLog).mockRejectedValue(new Error('boom'));
    render(<HabitsBoard initialHabits={[makeHabit({ logs: [] })]} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Stretch' });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  test('reordering via drag calls reorderHabits with the new order, reverting on failure', async () => {
    vi.mocked(actions.reorderHabits).mockRejectedValue(new Error('boom'));
    render(<HabitsBoard initialHabits={[makeHabit({ id: 'a', name: 'A', order: 0 }), makeHabit({ id: 'b', name: 'B', order: 1 })]} />);
    // Habit A is both the auto-selected habit (rendered in HabitDetail's
    // header) and the dragged list card, so "A" appears twice on the page
    // at once — intended behavior, not a bug. Disambiguate by picking the
    // match that has a draggable list-card ancestor. Habit B is not
    // selected at this point, so its name only renders once.
    const cardA = screen.getAllByText('A').map((el) => el.closest('div[draggable]')).find(Boolean)!;
    const cardB = screen.getByText('B').closest('div[draggable]')!;
    fireEvent.dragStart(cardA);
    fireEvent.drop(cardB);
    await waitFor(() => expect(actions.reorderHabits).toHaveBeenCalledWith(['b', 'a']));
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });
});
