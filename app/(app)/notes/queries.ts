import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeNote, type NoteDTO } from '@/app/lib/note-dto';

export type { NoteDTO };

export async function getNotes(): Promise<NoteDTO[]> {
  await verifySession();
  const notes = await prisma.note.findMany({ orderBy: { updatedAt: 'desc' } });
  return notes.map(serializeNote);
}
