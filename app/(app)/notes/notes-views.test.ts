import { describe, test, expect } from 'vitest';
import { sortNotes, filterNotes } from './notes-views';
import type { NoteDTO } from '@/app/lib/note-dto';

function note(id: string, overrides: Partial<NoteDTO> = {}): NoteDTO {
  return { id, text: id, pinned: false, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', ...overrides };
}

describe('sortNotes', () => {
  test('pinned first, then most recently updated first', () => {
    const notes = [
      note('old', { updatedAt: '2026-09-01T00:00:00.000Z' }),
      note('new', { updatedAt: '2026-09-20T00:00:00.000Z' }),
      note('pinned-old', { pinned: true, updatedAt: '2026-08-01T00:00:00.000Z' }),
    ];
    expect(sortNotes(notes).map((n) => n.id)).toEqual(['pinned-old', 'new', 'old']);
  });

  test('does not mutate its input', () => {
    const notes = [note('a', { updatedAt: '2026-09-01T00:00:00.000Z' }), note('b', { updatedAt: '2026-09-02T00:00:00.000Z' })];
    sortNotes(notes);
    expect(notes.map((n) => n.id)).toEqual(['a', 'b']);
  });
});

describe('filterNotes', () => {
  const notes = [note('1', { text: 'Buy Milk' }), note('2', { text: 'call the bank' })];

  test('blank query returns every note', () => {
    expect(filterNotes(notes, '   ')).toHaveLength(2);
  });

  test('case-insensitive substring match', () => {
    expect(filterNotes(notes, 'milk').map((n) => n.id)).toEqual(['1']);
    expect(filterNotes(notes, ' BANK ').map((n) => n.id)).toEqual(['2']);
    expect(filterNotes(notes, 'zzz')).toEqual([]);
  });
});
