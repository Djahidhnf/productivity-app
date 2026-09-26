import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotesBoard } from './notes-board';
import * as actions from './actions';
import type { NoteDTO } from '@/app/lib/note-dto';

vi.mock('./actions', () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  setNotePinned: vi.fn(),
  deleteNote: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets pending promise callbacks (and the state updates they cause) run. */
async function flushPromises() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

function makeNote(id: string, overrides: Partial<NoteDTO> = {}): NoteDTO {
  return { id, text: `Note ${id}`, pinned: false, createdAt: '2026-09-20T10:00:00.000Z', updatedAt: '2026-09-20T10:00:00.000Z', ...overrides };
}

describe('NotesBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T12:00:00'));
    window.alert = vi.fn();
    vi.mocked(actions.updateNote).mockImplementation(async (id, text) => makeNote(id, { text }));
    vi.mocked(actions.setNotePinned).mockImplementation(async (id, pinned) => makeNote(id, { pinned }));
    vi.mocked(actions.deleteNote).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows the count, and pinned notes before newer unpinned ones', () => {
    render(
      <NotesBoard
        initialNotes={[
          makeNote('a', { text: 'Newer', updatedAt: '2026-09-25T10:00:00.000Z' }),
          makeNote('b', { text: 'Pinned', pinned: true }),
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: /Notes/ })).toHaveTextContent('2');
    const texts = screen.getAllByRole('button', { name: /Newer|Pinned/ }).map((b) => b.textContent);
    expect(texts).toEqual(['Pinned', 'Newer']);
  });

  test('empty state and search', () => {
    const { unmount } = render(<NotesBoard initialNotes={[]} />);
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
    unmount();
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Buy milk' }), makeNote('b', { text: 'Bank' })]} />);
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'MILK' } });
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.queryByText('Bank')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'zzz' } });
    expect(screen.getByText('No matches.')).toBeInTheDocument();
  });

  test('saving from the composer adds the note to the grid', async () => {
    vi.mocked(actions.createNote).mockResolvedValue(makeNote('new', { text: 'Fresh note' }));
    render(<NotesBoard initialNotes={[]} />);
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), { target: { value: 'Fresh note' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(actions.createNote).toHaveBeenCalledWith('Fresh note');
    expect(screen.getByText('Fresh note')).toBeInTheDocument();
  });

  test('a failed create alerts and keeps the draft', async () => {
    vi.mocked(actions.createNote).mockRejectedValue(new Error('boom'));
    render(<NotesBoard initialNotes={[]} />);
    const box = screen.getByPlaceholderText("What's on your mind?");
    fireEvent.change(box, { target: { value: 'Oops' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(window.alert).toHaveBeenCalled();
    expect(box).toHaveValue('Oops');
  });

  test('pin is optimistic and rolls back on failure', async () => {
    vi.mocked(actions.setNotePinned).mockRejectedValue(new Error('boom'));
    render(<NotesBoard initialNotes={[makeNote('a')]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    });
    expect(actions.setNotePinned).toHaveBeenCalledWith('a', true);
    expect(window.alert).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pin' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('delete removes the card', async () => {
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Bye' })]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });
    expect(actions.deleteNote).toHaveBeenCalledWith('a');
    expect(screen.queryByText('Bye')).not.toBeInTheDocument();
  });

  test('editing in the dialog debounces the save and Done flushes it', () => {
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Draft' })]} />);
    fireEvent.click(screen.getByText('Draft'));
    const box = within(screen.getByRole('dialog')).getByLabelText('Note text');
    fireEvent.change(box, { target: { value: 'Draft v2' } });
    expect(actions.updateNote).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(actions.updateNote).toHaveBeenCalledWith('a', 'Draft v2');
    fireEvent.change(box, { target: { value: 'Draft v3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(actions.updateNote).toHaveBeenLastCalledWith('a', 'Draft v3');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Draft v3')).toBeInTheDocument();
  });

  test('closing the dialog with blank text deletes the note instead of saving', async () => {
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Soon empty' })]} />);
    fireEvent.click(screen.getByText('Soon empty'));
    fireEvent.change(screen.getByLabelText('Note text'), { target: { value: '  ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    });
    expect(actions.updateNote).not.toHaveBeenCalled();
    expect(actions.deleteNote).toHaveBeenCalledWith('a');
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  test('a failed autosave shows "Couldn\'t save" in the dialog', async () => {
    vi.mocked(actions.updateNote).mockRejectedValue(new Error('boom'));
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Draft' })]} />);
    fireEvent.click(screen.getByText('Draft'));
    fireEvent.change(screen.getByLabelText('Note text'), { target: { value: 'Draft v2' } });
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Couldn't save")).toBeInTheDocument();
  });

  describe('autosave races', () => {
    function openAndType(openText: string, value: string) {
      fireEvent.click(screen.getByText(openText));
      fireEvent.change(screen.getByLabelText('Note text'), { target: { value } });
    }

    function callsFor(id: string) {
      return vi.mocked(actions.updateNote).mock.calls.filter(([callId]) => callId === id);
    }

    function advanceDebounce() {
      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    test('a stale failed save never overwrites a newer one', async () => {
      const v2 = deferred<NoteDTO>();
      const v3 = deferred<NoteDTO>();
      vi.mocked(actions.updateNote).mockReturnValueOnce(v2.promise).mockReturnValueOnce(v3.promise);
      const { unmount } = render(<NotesBoard initialNotes={[makeNote('a', { text: 'Draft' })]} />);
      openAndType('Draft', 'Draft v2');
      advanceDebounce();
      fireEvent.change(screen.getByLabelText('Note text'), { target: { value: 'Draft v3' } });
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(actions.updateNote).toHaveBeenLastCalledWith('a', 'Draft v3');
      v2.reject(new Error('boom'));
      v3.resolve(makeNote('a', { text: 'Draft v3' }));
      await flushPromises();
      unmount();
      expect(actions.updateNote).toHaveBeenCalledTimes(2);
      expect(actions.updateNote).toHaveBeenLastCalledWith('a', 'Draft v3');
    });

    test('editing another note retries a failed save instead of dropping it', async () => {
      vi.mocked(actions.updateNote).mockImplementation(async (id, text) => {
        if (id === 'a') throw new Error('boom');
        return makeNote(id, { text });
      });
      render(<NotesBoard initialNotes={[makeNote('a', { text: 'Alpha' }), makeNote('b', { text: 'Beta' })]} />);
      openAndType('Alpha', 'Alpha v2');
      advanceDebounce();
      await flushPromises();
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      await flushPromises();
      const failedAttempts = callsFor('a').length;
      openAndType('Beta', 'Beta v2');
      advanceDebounce();
      await flushPromises();
      expect(callsFor('a').length).toBeGreaterThan(failedAttempts);
      expect(callsFor('a').at(-1)).toEqual(['a', 'Alpha v2']);
      expect(actions.updateNote).toHaveBeenCalledWith('b', 'Beta v2');
    });

    test("a failed save of one note does not show \"Couldn't save\" in another note's dialog", async () => {
      const save = deferred<NoteDTO>();
      vi.mocked(actions.updateNote).mockReturnValueOnce(save.promise);
      render(<NotesBoard initialNotes={[makeNote('a', { text: 'Alpha' }), makeNote('b', { text: 'Beta' })]} />);
      openAndType('Alpha', 'Alpha v2');
      advanceDebounce();
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      fireEvent.click(screen.getByText('Beta'));
      save.reject(new Error('boom'));
      await flushPromises();
      expect(screen.getByLabelText('Note text')).toHaveValue('Beta');
      expect(screen.queryByText("Couldn't save")).not.toBeInTheDocument();
    });

    test('a failed delete restores the note and its unsaved edit', async () => {
      vi.mocked(actions.deleteNote).mockRejectedValue(new Error('boom'));
      const { unmount } = render(<NotesBoard initialNotes={[makeNote('a', { text: 'Alpha' })]} />);
      openAndType('Alpha', 'Alpha edited');
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
      await flushPromises();
      expect(window.alert).toHaveBeenCalled();
      expect(screen.getByText('Alpha edited')).toBeInTheDocument();
      unmount();
      expect(actions.updateNote).toHaveBeenLastCalledWith('a', 'Alpha edited');
    });

    test('a failed save is retried by the next edit and the error clears on success', async () => {
      vi.mocked(actions.updateNote).mockRejectedValueOnce(new Error('boom'));
      render(<NotesBoard initialNotes={[makeNote('a', { text: 'Draft' })]} />);
      openAndType('Draft', 'Draft v2');
      advanceDebounce();
      await flushPromises();
      expect(screen.getByText("Couldn't save")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Note text'), { target: { value: 'Draft v3' } });
      advanceDebounce();
      await flushPromises();
      expect(actions.updateNote).toHaveBeenLastCalledWith('a', 'Draft v3');
      expect(screen.queryByText("Couldn't save")).not.toBeInTheDocument();
    });

    test('a save retried on close keeps its error until the retry succeeds', async () => {
      vi.mocked(actions.updateNote).mockRejectedValueOnce(new Error('boom')).mockRejectedValueOnce(new Error('boom'));
      render(<NotesBoard initialNotes={[makeNote('a', { text: 'Draft' })]} />);
      openAndType('Draft', 'Draft v2');
      advanceDebounce();
      await flushPromises();
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      await flushPromises();
      expect(actions.updateNote).toHaveBeenCalledTimes(2);
      fireEvent.click(screen.getByText('Draft v2'));
      expect(screen.getByText("Couldn't save")).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      await flushPromises();
      expect(actions.updateNote).toHaveBeenCalledTimes(3);
      expect(actions.updateNote).toHaveBeenLastCalledWith('a', 'Draft v2');
      fireEvent.click(screen.getByText('Draft v2'));
      expect(screen.queryByText("Couldn't save")).not.toBeInTheDocument();
    });

    test('a save that fails after its note was deleted is not retried', async () => {
      const save = deferred<NoteDTO>();
      vi.mocked(actions.updateNote).mockReturnValueOnce(save.promise);
      const { unmount } = render(<NotesBoard initialNotes={[makeNote('a', { text: 'Alpha' })]} />);
      openAndType('Alpha', 'Alpha v2');
      advanceDebounce();
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      });
      expect(actions.deleteNote).toHaveBeenCalledWith('a');
      save.reject(new Error('boom'));
      await flushPromises();
      unmount();
      expect(actions.updateNote).toHaveBeenCalledTimes(1);
    });
  });
});
