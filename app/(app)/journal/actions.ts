'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { Mood } from '@prisma/client';
import { serializeJournalEntry, type JournalEntryDTO } from '@/app/lib/journal-dto';

export interface SaveJournalEntryInput {
  date: string;
  text: string;
  mood: Mood;
}

export async function saveJournalEntry(input: SaveJournalEntryInput): Promise<JournalEntryDTO> {
  await verifySession();
  const dateValue = new Date(input.date);
  const entry = await prisma.journalEntry.upsert({
    where: { date: dateValue },
    create: { date: dateValue, text: input.text, mood: input.mood },
    update: { text: input.text, mood: input.mood },
  });
  revalidatePath('/journal', 'layout');
  return serializeJournalEntry(entry);
}
