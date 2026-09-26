import type { NoteDTO } from '@/app/lib/note-dto';

/** Pinned notes first, then most recently edited. ISO strings sort chronologically. */
export function sortNotes(notes: NoteDTO[]): NoteDTO[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
  });
}

export function filterNotes(notes: NoteDTO[], query: string): NoteDTO[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...notes];
  return notes.filter((n) => n.text.toLowerCase().includes(q));
}
