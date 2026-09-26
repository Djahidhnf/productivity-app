'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import { serializeNote, type NoteDTO } from '@/app/lib/note-dto';

export async function createNote(text: string): Promise<NoteDTO> {
  await verifySession();
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Note text is required');
  const note = await prisma.note.create({ data: { text: trimmed } });
  revalidatePath('/notes');
  return serializeNote(note);
}

// Saves the text as typed (trailing newlines and all). Blank notes are
// deleted by the client when the edit dialog closes, not here.
export async function updateNote(id: string, text: string): Promise<NoteDTO> {
  await verifySession();
  const note = await prisma.note.update({ where: { id }, data: { text } });
  revalidatePath('/notes');
  return serializeNote(note);
}

// Pinning is not an edit, so updatedAt is written back unchanged
// (Prisma only auto-sets @updatedAt when the field isn't given).
export async function setNotePinned(id: string, pinned: boolean): Promise<NoteDTO> {
  await verifySession();
  const existing = await prisma.note.findUniqueOrThrow({ where: { id } });
  const note = await prisma.note.update({ where: { id }, data: { pinned, updatedAt: existing.updatedAt } });
  revalidatePath('/notes');
  return serializeNote(note);
}

export async function deleteNote(id: string): Promise<void> {
  await verifySession();
  await prisma.note.delete({ where: { id } });
  revalidatePath('/notes');
}
