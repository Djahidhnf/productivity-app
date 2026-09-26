import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { NoteCard } from './note-card';
import type { NoteDTO } from '@/app/lib/note-dto';

const now = new Date('2026-09-26T12:00:00');
const base: NoteDTO = {
  id: 'n1',
  text: 'First line\nSecond line',
  pinned: false,
  createdAt: '2026-09-26T09:00:00.000Z',
  updatedAt: new Date('2026-09-26T09:00:00').toISOString(),
};

function setup(note: NoteDTO = base) {
  const handlers = { onOpen: vi.fn(), onTogglePin: vi.fn(), onDelete: vi.fn() };
  render(<NoteCard note={note} now={now} {...handlers} />);
  return handlers;
}

describe('NoteCard', () => {
  test('shows the text and relative edit time', () => {
    setup();
    expect(screen.getByText(/First line/)).toBeInTheDocument();
    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  test('clicking the text opens the note', () => {
    const h = setup();
    fireEvent.click(screen.getByText(/First line/));
    expect(h.onOpen).toHaveBeenCalledOnce();
  });

  test('pin and delete call their handlers without opening', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(h.onTogglePin).toHaveBeenCalledOnce();
    expect(h.onDelete).toHaveBeenCalledOnce();
    expect(h.onOpen).not.toHaveBeenCalled();
  });

  test('a pinned note shows a pressed Unpin button', () => {
    setup({ ...base, pinned: true });
    expect(screen.getByRole('button', { name: 'Unpin' })).toHaveAttribute('aria-pressed', 'true');
  });
});
