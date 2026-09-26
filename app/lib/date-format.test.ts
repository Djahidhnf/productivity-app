import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { todayKey, formatDueLabel, relativeTime } from './date-format';

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

describe('relativeTime', () => {
  const now = new Date('2026-09-26T12:00:00');

  test('under a minute is "just now"', () => {
    expect(relativeTime(new Date('2026-09-26T11:59:30').toISOString(), now)).toBe('just now');
  });

  test('minutes, hours and days', () => {
    expect(relativeTime(new Date('2026-09-26T11:55:00').toISOString(), now)).toBe('5m ago');
    expect(relativeTime(new Date('2026-09-26T09:00:00').toISOString(), now)).toBe('3h ago');
    expect(relativeTime(new Date('2026-09-24T12:00:00').toISOString(), now)).toBe('2d ago');
  });

  test('older than 7 days shows a short date, adding the year only when it differs', () => {
    expect(relativeTime(new Date('2026-09-12T08:00:00').toISOString(), now)).toBe('12 Sep');
    expect(relativeTime(new Date('2025-03-04T08:00:00').toISOString(), now)).toBe('4 Mar 2025');
  });

  test('a timestamp in the future is "just now"', () => {
    expect(relativeTime(new Date('2026-09-26T12:05:00').toISOString(), now)).toBe('just now');
  });
});
