import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { todayKey, formatDueLabel } from './date-format';

describe('todayKey / formatDueLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0)); // local: March 15, 2026, 10:00am
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('todayKey returns the local calendar date', () => {
    expect(todayKey()).toBe('2026-03-15');
  });

  test('returns null when due is null', () => {
    expect(formatDueLabel(null, null)).toBeNull();
  });

  test('labels the current local date as Today', () => {
    expect(formatDueLabel('2026-03-15', null)).toBe('Today');
  });

  test('labels the next local calendar date as Tomorrow', () => {
    expect(formatDueLabel('2026-03-16', null)).toBe('Tomorrow');
  });

  test('labels other dates as MM-DD', () => {
    expect(formatDueLabel('2026-04-02', null)).toBe('04-02');
  });

  test('appends a 12-hour time when dueTime is set', () => {
    expect(formatDueLabel('2026-03-15', 90)).toBe('Today 1:30AM');
    expect(formatDueLabel('2026-03-15', 810)).toBe('Today 1:30PM');
  });
});
