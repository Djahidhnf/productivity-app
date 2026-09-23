import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeJournalEntry, type JournalEntryDTO } from '@/app/lib/journal-dto';

export type { JournalEntryDTO };

export async function getJournalEntries(): Promise<JournalEntryDTO[]> {
  await verifySession();
  const entries = await prisma.journalEntry.findMany({
    orderBy: { date: 'desc' },
  });
  return entries.map(serializeJournalEntry);
}
