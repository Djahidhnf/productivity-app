import { describe, test, expect } from 'vitest';
import { zonedDateTimeToUtc, zonedDateKey, isValidTimeZone } from './zoned';

describe('zonedDateTimeToUtc', () => {
  test('UTC is identity', () => {
    expect(zonedDateTimeToUtc('2026-10-05', 14 * 60, 'UTC').toISOString()).toBe('2026-10-05T14:00:00.000Z');
  });

  test('Africa/Algiers is UTC+1 all year', () => {
    expect(zonedDateTimeToUtc('2026-07-01', 9 * 60, 'Africa/Algiers').toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(zonedDateTimeToUtc('2026-01-01', 0, 'Africa/Algiers').toISOString()).toBe('2025-12-31T23:00:00.000Z');
  });

  test('Europe/Paris uses the right offset either side of DST', () => {
    expect(zonedDateTimeToUtc('2026-03-28', 9 * 60, 'Europe/Paris').toISOString()).toBe('2026-03-28T08:00:00.000Z');
    expect(zonedDateTimeToUtc('2026-03-29', 9 * 60, 'Europe/Paris').toISOString()).toBe('2026-03-29T07:00:00.000Z');
  });

  test('a wall time in the spring-forward gap moves forward past the jump', () => {
    // 02:30 doesn't exist in Paris on 2026-03-29; it reads as 03:30 CEST.
    expect(zonedDateTimeToUtc('2026-03-29', 2 * 60 + 30, 'Europe/Paris').toISOString()).toBe('2026-03-29T01:30:00.000Z');
  });

  test('a repeated wall time in the fall-back overlap takes the earlier instant', () => {
    // 02:30 happens twice in Paris on 2026-10-25; the first is 02:30 CEST = 00:30Z.
    expect(zonedDateTimeToUtc('2026-10-25', 2 * 60 + 30, 'Europe/Paris').toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });
});

describe('zonedDateKey', () => {
  test('returns the wall-calendar date in the zone', () => {
    const instant = new Date('2026-10-05T23:30:00Z');
    expect(zonedDateKey(instant, 'UTC')).toBe('2026-10-05');
    expect(zonedDateKey(instant, 'Africa/Algiers')).toBe('2026-10-06');
    expect(zonedDateKey(instant, 'America/New_York')).toBe('2026-10-05');
  });
});

describe('isValidTimeZone', () => {
  test('accepts IANA zones and rejects junk', () => {
    expect(isValidTimeZone('Africa/Algiers')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
  });
});
