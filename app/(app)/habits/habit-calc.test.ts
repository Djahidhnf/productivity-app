import { describe, test, expect } from 'vitest';
import { habitStreak, habitMonthlyPct, buildHeatCells, buildHabitMonthCells, moveHabit } from './habit-calc';

describe('habitStreak', () => {
  test('counts backward from today when today is logged', () => {
    expect(habitStreak(['2026-09-21', '2026-09-22', '2026-09-23'], '2026-09-23')).toBe(3);
  });

  test('starts from yesterday when today is not yet logged, so a streak is banked before check-in', () => {
    expect(habitStreak(['2026-09-21', '2026-09-22'], '2026-09-23')).toBe(2);
  });

  test('returns 0 when neither today nor yesterday is logged', () => {
    expect(habitStreak(['2026-09-10'], '2026-09-23')).toBe(0);
  });

  test('stops at the first gap', () => {
    expect(habitStreak(['2026-09-19', '2026-09-21', '2026-09-22', '2026-09-23'], '2026-09-23')).toBe(3);
  });
});

describe('habitMonthlyPct', () => {
  test('daily habit: check-ins this month over days elapsed this month', () => {
    const logs = ['2026-09-01', '2026-09-02', '2026-08-31', '2026-09-23'];
    const pct = habitMonthlyPct({ freqType: 'DAILY', timesPerWeek: null }, logs, '2026-09-23');
    // 3 check-ins in September (08-31 excluded) / 23 days elapsed = 13%
    expect(pct).toBe(Math.round((3 / 23) * 100));
  });

  test('weekly habit: check-ins over (weeks elapsed * timesPerWeek)', () => {
    const logs = ['2026-09-01', '2026-09-08', '2026-09-15'];
    const pct = habitMonthlyPct({ freqType: 'WEEKLY', timesPerWeek: 2 }, logs, '2026-09-23');
    // daysElapsed=23 -> weeksElapsed=ceil(23/7)=4, goal=8, completions=3
    expect(pct).toBe(Math.round((3 / 8) * 100));
  });

  test('caps at 100%', () => {
    const logs = Array.from({ length: 23 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
    const pct = habitMonthlyPct({ freqType: 'DAILY', timesPerWeek: null }, logs, '2026-09-23');
    expect(pct).toBe(100);
  });

  test('never divides by zero on day 1 of the month', () => {
    const pct = habitMonthlyPct({ freqType: 'DAILY', timesPerWeek: null }, [], '2026-09-01');
    expect(pct).toBe(0);
    expect(Number.isFinite(pct)).toBe(true);
  });
});

describe('buildHeatCells', () => {
  test('returns weeks*7 cells ending on today, in date-sequential order', () => {
    const { cells } = buildHeatCells([], '2026-01-01', '2026-09-23', 4);
    expect(cells).toHaveLength(28);
    expect(cells[cells.length - 1].dateKey).toBe('2026-09-23');
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].dateKey > cells[i - 1].dateKey).toBe(true);
    }
  });

  test('marks logged, future, and beforeStart correctly', () => {
    const { cells } = buildHeatCells(['2026-09-23'], '2026-09-20', '2026-09-23', 1);
    const byDate = Object.fromEntries(cells.map((c) => [c.dateKey, c]));
    expect(byDate['2026-09-23'].logged).toBe(true);
    expect(byDate['2026-09-23'].future).toBe(false);
    expect(byDate['2026-09-19']?.beforeStart ?? true).toBe(true);
    const anyFuture = cells.some((c) => c.dateKey > '2026-09-23');
    expect(anyFuture).toBe(false); // grid never extends past today
  });

  test('startLabel matches the first cell date, formatted', () => {
    const { cells, startLabel } = buildHeatCells([], '2026-01-01', '2026-09-23', 2);
    expect(startLabel.length).toBeGreaterThan(0);
    expect(cells[0].dateKey <= '2026-09-23').toBe(true);
  });
});

describe('buildHabitMonthCells', () => {
  test('returns 42 cells for September 2026, Sunday-start', () => {
    const cells = buildHabitMonthCells([], '2026-09-01', '2026-09-23');
    expect(cells).toHaveLength(42);
    expect(cells[0].dateKey).toBe('2026-08-30'); // Sept 1 2026 is a Tuesday, grid starts Sunday Aug 30
  });

  test('marks logged, isToday, and future correctly, ignoring startDate', () => {
    const cells = buildHabitMonthCells(['2026-09-23'], '2026-09-01', '2026-09-23');
    const today = cells.find((c) => c.dateKey === '2026-09-23')!;
    expect(today.logged).toBe(true);
    expect(today.isToday).toBe(true);
    expect(today.future).toBe(false);
    const future = cells.find((c) => c.dateKey === '2026-09-24')!;
    expect(future.future).toBe(true);
  });

  test('dayNum matches the date-of-month', () => {
    const cells = buildHabitMonthCells([], '2026-09-01', '2026-09-23');
    const sept23 = cells.find((c) => c.dateKey === '2026-09-23')!;
    expect(sept23.dayNum).toBe(23);
  });
});

describe('moveHabit', () => {
  test('moves an item to another position by id', () => {
    const habits = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(moveHabit(habits, 'a', 'c').map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });

  test('is a no-op when dragging onto itself', () => {
    const habits = [{ id: 'a' }, { id: 'b' }];
    expect(moveHabit(habits, 'a', 'a')).toEqual(habits);
  });
});
