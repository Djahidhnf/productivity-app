import { describe, test, expect } from 'vitest';
import {
  MIN_YEAR,
  MAX_YEAR,
  MIN_MONTH_INDEX,
  MAX_MONTH_INDEX,
  clampYear,
  yearOfDateKey,
  monthIndexOfDateKey,
  monthIndexToParts,
  firstOfMonthKey,
  firstOfYearKey,
} from '@/app/lib/calendar-units';

describe('clampYear', () => {
  test('clamps to 1900–2100 and truncates fractions', () => {
    expect(clampYear(1800)).toBe(MIN_YEAR);
    expect(clampYear(2500)).toBe(MAX_YEAR);
    expect(clampYear(2026)).toBe(2026);
    expect(clampYear(2026.7)).toBe(2026);
  });
});

describe('month index helpers', () => {
  test('yearOfDateKey reads the year', () => {
    expect(yearOfDateKey('2026-09-23')).toBe(2026);
  });

  test('monthIndexOfDateKey is year*12 + zero-based month', () => {
    expect(monthIndexOfDateKey('2026-09-23')).toBe(2026 * 12 + 8);
    expect(monthIndexOfDateKey('2027-01-01')).toBe(2027 * 12);
  });

  test('monthIndexToParts round-trips', () => {
    expect(monthIndexToParts(2026 * 12 + 8)).toEqual({ year: 2026, month: 8 });
    expect(monthIndexToParts(2027 * 12)).toEqual({ year: 2027, month: 0 });
  });

  test('firstOfMonthKey and firstOfYearKey build zero-padded keys', () => {
    expect(firstOfMonthKey(2026 * 12 + 8)).toBe('2026-09-01');
    expect(firstOfMonthKey(2027 * 12)).toBe('2027-01-01');
    expect(firstOfYearKey(2026)).toBe('2026-01-01');
  });

  test('the bounds are January 1900 and December 2100', () => {
    expect(firstOfMonthKey(MIN_MONTH_INDEX)).toBe('1900-01-01');
    expect(firstOfMonthKey(MAX_MONTH_INDEX)).toBe('2100-12-01');
  });
});
