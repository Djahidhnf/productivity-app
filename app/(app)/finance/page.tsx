import { getFinanceEntries } from './queries';
import { FinanceBoard } from './finance-board';
import { addMonthKey, parseMonthParam } from '@/app/lib/finance';
import { todayKey } from '@/app/lib/date-format';

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { month: raw } = await searchParams;
  const month = parseMonthParam(typeof raw === 'string' ? raw : undefined, todayKey().slice(0, 7));
  const entries = await getFinanceEntries(addMonthKey(month, -5), month);
  return <FinanceBoard key={month} month={month} entries={entries} />;
}
