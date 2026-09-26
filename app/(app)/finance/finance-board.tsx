'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/shell/page-header';
import { todayKey as getTodayKey } from '@/app/lib/date-format';
import { MIN_MONTH_INDEX, MAX_MONTH_INDEX } from '@/app/lib/calendar-units';
import { addMonthKey, monthKeyLabel, monthIndexOfMonthKey } from '@/app/lib/finance';
import type { FinanceEntryDTO } from '@/app/lib/finance-dto';
import { createFinanceEntry, deleteFinanceEntry, type CreateFinanceEntryInput } from './actions';
import { monthTotals, categoryBreakdown, lastSixMonths, groupByDay, entriesInMonth } from './finance-views';
import { MonthSwitcher } from './month-switcher';
import { FinanceTotals } from './finance-totals';
import { EntryForm } from './entry-form';
import { CategoryBreakdown } from './category-breakdown';
import { MonthChart } from './month-chart';
import { EntryList } from './entry-list';

export interface FinanceBoardProps {
  /** 'YYYY-MM' being viewed. */
  month: string;
  /** Entries for `month` and the five months before it. */
  entries: FinanceEntryDTO[];
}

// page.tsx renders this with key={month}, so a month change remounts it with fresh entries.
export function FinanceBoard({ month, entries: initialEntries }: FinanceBoardProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const today = getTodayKey();
  const monthIndex = monthIndexOfMonthKey(month);

  function goTo(target: string) {
    router.push(`/finance?month=${target}`);
  }

  async function handleCreate(input: CreateFinanceEntryInput): Promise<boolean> {
    try {
      const entry = await createFinanceEntry(input);
      const entryMonth = entry.date.slice(0, 7);
      if (entryMonth === month) setEntries((prev) => [entry, ...prev]);
      else goTo(entryMonth);
      return true;
    } catch {
      window.alert('Could not log the entry. Please try again.');
      return false;
    }
  }

  async function handleDelete(id: string) {
    const removed = entries.find((e) => e.id === id);
    if (!removed) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteFinanceEntry(id);
    } catch {
      setEntries((prev) => [removed, ...prev]);
      window.alert('Could not remove the entry. Please try again.');
    }
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <PageHeader
        title="Finance"
        actions={
          <MonthSwitcher
            label={monthKeyLabel(month)}
            onPrev={() => goTo(addMonthKey(month, -1))}
            onNext={() => goTo(addMonthKey(month, 1))}
            prevDisabled={monthIndex <= MIN_MONTH_INDEX}
            nextDisabled={monthIndex >= MAX_MONTH_INDEX}
          />
        }
      />
      <div className="pw-finance">
        <FinanceTotals totals={monthTotals(entries, month)} />
        <EntryForm defaultDate={today} onSubmit={handleCreate} />
        <div className="pw-fin-two">
          <CategoryBreakdown rows={categoryBreakdown(entries, month)} />
          <MonthChart months={lastSixMonths(entries, month)} selected={month} onSelect={goTo} />
        </div>
        <EntryList
          groups={groupByDay(entries, month, today)}
          count={entriesInMonth(entries, month).length}
          onDelete={(id) => void handleDelete(id)}
        />
      </div>
    </div>
  );
}
