import type { Mood } from '@prisma/client';
import { calendarDateLabel } from '@/app/lib/calendar-dates';
import type { JournalEntryDTO } from '@/app/lib/journal-dto';

export function truncatePreview(text: string, max = 140): string {
  return text.slice(0, max) + (text.length > max ? '…' : '');
}

export const MOOD_LABELS: Record<Mood, string> = {
  GREAT: 'Great',
  GOOD: 'Good',
  OKAY: 'Okay',
  LOW: 'Low',
  ROUGH: 'Rough',
};

export interface JournalHistoryItem {
  date: string;
  dateLabel: string;
  moodLabel: string;
  preview: string;
}

export function buildJournalHistory(
  entries: JournalEntryDTO[],
  currentDate: string,
  todayKey: string
): JournalHistoryItem[] {
  return entries
    .filter((e) => e.date !== currentDate && e.text.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({
      date: e.date,
      dateLabel: calendarDateLabel(e.date, todayKey),
      moodLabel: MOOD_LABELS[e.mood],
      preview: truncatePreview(e.text),
    }));
}
