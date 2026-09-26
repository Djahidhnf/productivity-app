import type { FinanceEntryDTO } from '@/app/lib/finance-dto';
import { addMonthKey, monthShortLabel, categoryColor } from '@/app/lib/finance';
import { calendarDateLabel } from '@/app/lib/calendar-dates';

export function entriesInMonth(entries: FinanceEntryDTO[], month: string): FinanceEntryDTO[] {
  return entries.filter((e) => e.date.startsWith(`${month}-`));
}

function signedAmount(e: FinanceEntryDTO): number {
  return e.type === 'INCOME' ? e.amount : -e.amount;
}

export interface MonthTotals {
  earned: number;
  spent: number;
  net: number;
}

export function monthTotals(entries: FinanceEntryDTO[], month: string): MonthTotals {
  let earned = 0;
  let spent = 0;
  for (const e of entriesInMonth(entries, month)) {
    if (e.type === 'INCOME') earned += e.amount;
    else spent += e.amount;
  }
  return { earned, spent, net: earned - spent };
}

export interface CategoryRow {
  name: string;
  amount: number;
  /** Share of the month's spending, rounded to a whole percent. */
  percent: number;
  /** Bar width in % of the largest category, at least 2. */
  width: number;
  color: string;
}

export function categoryBreakdown(entries: FinanceEntryDTO[], month: string): CategoryRow[] {
  const byCategory = new Map<string, number>();
  for (const e of entriesInMonth(entries, month)) {
    if (e.type === 'EXPENSE') byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const sorted = [...byCategory].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, amount]) => sum + amount, 0);
  const largest = sorted[0]?.[1] ?? 1;
  return sorted.map(([name, amount]) => ({
    name,
    amount,
    percent: Math.round((amount / total) * 100),
    width: Math.max(2, (amount / largest) * 100),
    color: categoryColor(name),
  }));
}

export interface ChartMonth {
  month: string;
  label: string;
  earned: number;
  spent: number;
}

export function lastSixMonths(entries: FinanceEntryDTO[], month: string): ChartMonth[] {
  return [5, 4, 3, 2, 1, 0].map((back) => {
    const m = addMonthKey(month, -back);
    const { earned, spent } = monthTotals(entries, m);
    return { month: m, label: monthShortLabel(m), earned, spent };
  });
}

export interface DayGroup {
  date: string;
  label: string;
  /** Signed centimes: income minus spending. */
  total: number;
  entries: FinanceEntryDTO[];
}

export function groupByDay(entries: FinanceEntryDTO[], month: string, todayKey: string): DayGroup[] {
  const byDate = new Map<string, FinanceEntryDTO[]>();
  for (const e of entriesInMonth(entries, month)) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  return [...byDate.keys()]
    .sort()
    .reverse()
    .map((date) => {
      const list = byDate.get(date)!;
      return {
        date,
        label: calendarDateLabel(date, todayKey),
        total: list.reduce((sum, e) => sum + signedAmount(e), 0),
        entries: list,
      };
    });
}
