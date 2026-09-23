import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { JournalBoard } from './journal-board';
import type { JournalEntryDTO } from './queries';
import * as actions from './actions';

vi.mock('./actions', () => ({
  saveJournalEntry: vi.fn(),
}));

function makeEntry(overrides: Partial<JournalEntryDTO> = {}): JournalEntryDTO {
  return { date: '2026-09-23', text: '', mood: 'OKAY', ...overrides };
}

describe('JournalBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(actions.saveJournalEntry).mockResolvedValue(makeEntry());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T12:00:00'));
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('typing debounces the save until 600ms of inactivity', () => {
    render(<JournalBoard initialEntries={[]} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'Hello' } });
    expect(actions.saveJournalEntry).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(actions.saveJournalEntry).toHaveBeenCalledWith({ date: '2026-09-23', text: 'Hello', mood: 'OKAY' });
  });

  test('a mood click saves immediately, without waiting for the debounce timer', () => {
    render(<JournalBoard initialEntries={[]} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Great' }));
    expect(actions.saveJournalEntry).toHaveBeenCalledWith({ date: '2026-09-23', text: '', mood: 'GREAT' });
  });

  test('clicking Next flushes a pending debounced save to the date being left, before navigating', () => {
    render(<JournalBoard initialEntries={[]} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'abc' } });
    expect(actions.saveJournalEntry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Next day'));
    expect(actions.saveJournalEntry).toHaveBeenCalledWith({ date: '2026-09-23', text: 'abc', mood: 'OKAY' });
    expect(screen.getByPlaceholderText('Write about your day…')).toHaveValue('');
  });

  test('unmounting flushes a pending debounced save', () => {
    const { unmount } = render(<JournalBoard initialEntries={[]} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'unsaved' } });
    expect(actions.saveJournalEntry).not.toHaveBeenCalled();
    unmount();
    expect(actions.saveJournalEntry).toHaveBeenCalledWith({ date: '2026-09-23', text: 'unsaved', mood: 'OKAY' });
  });

  test('shows an alert if a save fails, without reverting the typed text', async () => {
    vi.mocked(actions.saveJournalEntry).mockRejectedValue(new Error('boom'));
    render(<JournalBoard initialEntries={[]} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'risky' } });
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });
    expect(window.alert).toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Write about your day…')).toHaveValue('risky');
  });

  test('clicking the already-selected mood does not save (no-op, avoids creating an empty row)', () => {
    render(<JournalBoard initialEntries={[]} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Okay' }));
    expect(actions.saveJournalEntry).not.toHaveBeenCalled();
  });

  test('clicking a history-card entry navigates the editor to that date', () => {
    const older = makeEntry({ date: '2026-09-20', text: 'Older entry text', mood: 'GOOD' });
    render(<JournalBoard initialEntries={[older]} />);
    fireEvent.click(screen.getByText('Older entry text'));
    expect(screen.getByPlaceholderText('Write about your day…')).toHaveValue('Older entry text');
  });
});
