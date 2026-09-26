import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { NoteDialog } from './note-dialog';
import type { NoteDTO } from '@/app/lib/note-dto';

const note: NoteDTO = { id: 'n1', text: 'Hello', pinned: false, createdAt: '2026-09-26T09:00:00.000Z', updatedAt: '2026-09-26T09:00:00.000Z' };

function setup(n: NoteDTO | null = note) {
  const handlers = { onTextChange: vi.fn(), onDelete: vi.fn(), onClose: vi.fn() };
  render(<NoteDialog note={n} description="Edited 3h ago" {...handlers} />);
  return handlers;
}

describe('NoteDialog', () => {
  test('is closed when there is no note', () => {
    setup(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows the text and description, and reports edits', () => {
    const h = setup();
    expect(screen.getByRole('dialog', { name: 'Note' })).toBeInTheDocument();
    expect(screen.getByText('Edited 3h ago')).toBeInTheDocument();
    const box = screen.getByLabelText('Note text');
    expect(box).toHaveValue('Hello');
    fireEvent.change(box, { target: { value: 'Hello there' } });
    expect(h.onTextChange).toHaveBeenCalledWith('Hello there');
  });

  test('Delete and Done call their handlers', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(h.onDelete).toHaveBeenCalledOnce();
    expect(h.onClose).toHaveBeenCalledOnce();
  });
});
