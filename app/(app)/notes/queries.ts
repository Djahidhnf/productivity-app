import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { requireUserId } from '@/app/lib/dal';
import { serializeNote, type NoteDTO } from '@/app/lib/note-dto';

export type { NoteDTO };

export async function getNotes(): Promise<NoteDTO[]> {
  const userId = await requireUserId();
  const notes = await prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  return notes.map(serializeNote);
}
