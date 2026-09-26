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
});
