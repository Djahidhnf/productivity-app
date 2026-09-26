export interface NoteDTO {
  id: string;
  text: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export function serializeNote(note: { id: string; text: string; pinned: boolean; createdAt: Date; updatedAt: Date }): NoteDTO {
  return {
    id: note.id,
    text: note.text,
    pinned: note.pinned,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}
