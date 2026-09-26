import { describe, test, expect } from 'vitest';
import { entriesInMonth, monthTotals, categoryBreakdown, lastSixMonths, groupByDay } from './finance-views';
import type { FinanceEntryDTO } from '@/app/lib/finance-dto';

let seq = 0;
function entry(date: string, type: 'EXPENSE' | 'INCOME', amount: number, category = type === 'INCOME' ? 'Salary' : 'Groceries'): FinanceEntryDTO {
  seq += 1;
  return { id: `e${seq}`, type, amount, category, note: '', date };
}

const entries = [
  entry('2026-09-22', 'EXPENSE', 3000, 'Dining'),
  entry('2026-09-22', 'INCOME', 100000),
  entry('2026-09-05', 'EXPENSE', 9000, 'Groceries'),
  entry('2026-09-01', 'EXPENSE', 1000, 'Dining'),
  entry('2026-08-30', 'EXPENSE', 50000, 'Housing'),
  entry('2026-04-02', 'INCOME', 20000),
];

describe('entriesInMonth / monthTotals', () => {
  test('filters by month prefix', () => {
    expect(entriesInMonth(entries, '2026-09')).toHaveLength(4);
    expect(entriesInMonth(entries, '2026-10')).toHaveLength(0);
  });

  test('sums earned, spent and net', () => {
    expect(monthTotals(entries, '2026-09')).toEqual({ earned: 100000, spent: 13000, net: 87000 });
    expect(monthTotals(entries, '2026-08')).toEqual({ earned: 0, spent: 50000, net: -50000 });
  });
});

describe('categoryBreakdown', () => {
  test('expense categories by amount, with percent of spend and bar width relative to the largest', () => {
    expect(categoryBreakdown(entries, '2026-09')).toEqual([
      { name: 'Groceries', amount: 9000, percent: 69, width: 100, color: 'var(--moss-500)' },
      { name: 'Dining', amount: 4000, percent: 31, width: (4000 / 9000) * 100, color: 'var(--amber-500)' },
    ]);
  });

  test('bars are at least 2% wide, and a month without spending is empty', () => {
    const rows = categoryBreakdown([entry('2026-07-01', 'EXPENSE', 100000, 'Housing'), entry('2026-07-02', 'EXPENSE', 1, 'Fun')], '2026-07');
    expect(rows[1].width).toBe(2);
    expect(categoryBreakdown(entries, '2026-04')).toEqual([]);
  });
});

describe('lastSixMonths', () => {
  test('six months oldest first, ending at the given month', () => {
    const months = lastSixMonths(entries, '2026-09');
    expect(months.map((m) => m.month)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
    expect(months[0]).toEqual({ month: '2026-04', label: 'Apr', earned: 20000, spent: 0 });
    expect(months[5]).toEqual({ month: '2026-09', label: 'Sep', earned: 100000, spent: 13000 });
  });
});

describe('groupByDay', () => {
  test('days newest first with labels and signed totals, keeping entry order within a day', () => {
    const groups = groupByDay(entries, '2026-09', '2026-09-23');
    expect(groups.map((g) => g.date)).toEqual(['2026-09-22', '2026-09-05', '2026-09-01']);
    expect(groups[0].label).toBe('Yesterday');
    expect(groups[1].label).toBe('Sat, Sep 5');
    expect(groups[0].total).toBe(97000);
    expect(groups[2].total).toBe(-1000);
    expect(groups[0].entries.map((e) => e.type)).toEqual(['EXPENSE', 'INCOME']);
  });
});
