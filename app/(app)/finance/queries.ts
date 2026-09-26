import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { addMonthKey } from '@/app/lib/finance';
import { serializeFinanceEntry, type FinanceEntryDTO } from '@/app/lib/finance-dto';

export type { FinanceEntryDTO };

/** Entries dated fromMonth-01 up to (not including) the month after toMonth, newest first. */
export async function getFinanceEntries(fromMonth: string, toMonth: string): Promise<FinanceEntryDTO[]> {
  await verifySession();
  const entries = await prisma.financeEntry.findMany({
    where: { date: { gte: new Date(`${fromMonth}-01`), lt: new Date(`${addMonthKey(toMonth, 1)}-01`) } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
  return entries.map(serializeFinanceEntry);
}
