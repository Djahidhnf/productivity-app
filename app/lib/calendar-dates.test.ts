import { describe, test, expect } from 'vitest';
import {
  addDays,
  addMonths,
  addYears,
  startOfWeekSunday,
  weekDates,
  buildMonthGrid,
  calendarDateLabel,
  shortDateLabel,
  monthYearLabel,
} from './calendar-dates';

describe('addDays / addMonths / addYears', () => {
  test('addDays moves forward and backward across a month boundary', () => {
    expect(addDays('2026-03-30', 3)).toBe('2026-04-02');
    expect(addDays('2026-04-02', -3)).toBe('2026-03-30');
  });

  test('addMonths clamps to the 1st of the target month', () => {
    expect(addMonths('2026-03-15', 1)).toBe('2026-04-01');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01');
  });

  test('addYears preserves the month, clamps to the 1st', () => {
    expect(addYears('2026-06-15', 1)).toBe('2027-06-01');
    expect(addYears('2026-06-15', -1)).toBe('2025-06-01');
  });
});

describe('startOfWeekSunday / weekDates', () => {
  test('startOfWeekSunday returns the Sunday on or before the given date', () => {
    // 2026-09-23 is a Wednesday
    expect(startOfWeekSunday('2026-09-23')).toBe('2026-09-20');
    // 2026-09-20 is itself a Sunday
    expect(startOfWeekSunday('2026-09-20')).toBe('2026-09-20');
  });

  test('weekDates returns 7 consecutive keys starting at the given date', () => {
    expect(weekDates('2026-09-20')).toEqual([
      '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23',
      '2026-09-24', '2026-09-25', '2026-09-26',
    ]);
  });
});

describe('buildMonthGrid', () => {
  test('always returns exactly 42 cells', () => {
    expect(buildMonthGrid(2026, 8)).toHaveLength(42); // September 2026 (0-indexed month 8)
  });

  test('starts on the Sunday on or before the 1st of the month', () => {
    // September 1, 2026 is a Tuesday, so the grid should start Sunday Aug 30.
    const grid = buildMonthGrid(2026, 8);
    expect(grid[0].dateKey).toBe('2026-08-30');
    expect(grid[0].inMonth).toBe(false);
  });

  test('marks every day actually in the target month as inMonth', () => {
    const grid = buildMonthGrid(2026, 8);
    const inMonthKeys = grid.filter((c) => c.inMonth).map((c) => c.dateKey);
    expect(inMonthKeys[0]).toBe('2026-09-01');
    expect(inMonthKeys[inMonthKeys.length - 1]).toBe('2026-09-30');
    expect(inMonthKeys).toHaveLength(30);
  });
});

describe('calendarDateLabel', () => {
  const today = '2026-09-23';

  test('labels the given today as Today', () => {
    expect(calendarDateLabel('2026-09-23', today)).toBe('Today');
  });

  test('labels the day before as Yesterday', () => {
    expect(calendarDateLabel('2026-09-22', today)).toBe('Yesterday');
  });

  test('labels the day after as Tomorrow', () => {
    expect(calendarDateLabel('2026-09-24', today)).toBe('Tomorrow');
  });

  test('falls back to a weekday/month/day format for other dates', () => {
    const label = calendarDateLabel('2026-12-25', today);
    expect(label).toContain('Dec');
    expect(label).toContain('25');
  });
});

describe('shortDateLabel / monthYearLabel', () => {
  test('shortDateLabel formats month and day only', () => {
    const label = shortDateLabel('2026-09-23');
    expect(label).toContain('Sep');
    expect(label).toContain('23');
  });

  test('monthYearLabel formats full month name and year', () => {
    const label = monthYearLabel('2026-09-01');
    expect(label).toContain('September');
    expect(label).toContain('2026');
  });
});
