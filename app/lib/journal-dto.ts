import type { Mood } from '@prisma/client';
import { toDateKey } from './task-dto';

export interface JournalEntryDTO {
  date: string;
  text: string;
  mood: Mood;
}

export function serializeJournalEntry(entry: { date: Date; text: string; mood: Mood }): JournalEntryDTO {
  return {
    date: toDateKey(entry.date)!,
    text: entry.text,
    mood: entry.mood,
  };
}
