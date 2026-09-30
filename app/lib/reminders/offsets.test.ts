import { describe, test, expect } from 'vitest';
import {
  taskReminderMode,
  isValidReminderOffset,
  normalizeReminderOffset,
  decomposeOffset,
  describeReminderOffset,
} from './offsets';

describe('taskReminderMode', () => {
  test('depends on due date and time', () => {
    expect(taskReminderMode(null, null)).toBe('disabled');
    expect(taskReminderMode('', 600)).toBe('disabled');
    expect(taskReminderMode('2026-10-01', null)).toBe('untimed');
    expect(taskReminderMode('2026-10-01', 0)).toBe('timed');
  });
});

describe('isValidReminderOffset / normalizeReminderOffset', () => {
  test('timed accepts any non-negative whole minutes', () => {
    expect(isValidReminderOffset(0, 'timed')).toBe(true);
    expect(isValidReminderOffset(30, 'timed')).toBe(true);
    expect(isValidReminderOffset(-5, 'timed')).toBe(false);
    expect(isValidReminderOffset(1.5, 'timed')).toBe(false);
  });

  test('untimed only accepts whole days', () => {
    expect(isValidReminderOffset(1440, 'untimed')).toBe(true);
    expect(isValidReminderOffset(60, 'untimed')).toBe(false);
  });

  test('normalize keeps never, clears disabled and resets unfit offsets to 0', () => {
    expect(normalizeReminderOffset(null, 'timed')).toBeNull();
    expect(normalizeReminderOffset(30, 'disabled')).toBeNull();
    expect(normalizeReminderOffset(30, 'untimed')).toBe(0);
    expect(normalizeReminderOffset(2880, 'untimed')).toBe(2880);
    expect(normalizeReminderOffset(45, 'timed')).toBe(45);
  });
});

describe('decomposeOffset / describeReminderOffset', () => {
  test('picks the largest unit that divides evenly', () => {
    expect(decomposeOffset(45)).toEqual({ amount: 45, unit: 'minutes' });
    expect(decomposeOffset(120)).toEqual({ amount: 2, unit: 'hours' });
    expect(decomposeOffset(2880)).toEqual({ amount: 2, unit: 'days' });
    expect(decomposeOffset(0, 'untimed')).toEqual({ amount: 0, unit: 'days' });
  });

  test('labels', () => {
    expect(describeReminderOffset(0, 'timed')).toBe('On time');
    expect(describeReminderOffset(0, 'untimed')).toBe('On the day (9:00)');
    expect(describeReminderOffset(30, 'timed')).toBe('30 min before');
    expect(describeReminderOffset(60, 'timed')).toBe('1 hour before');
    expect(describeReminderOffset(2880, 'untimed')).toBe('2 days before');
  });
});
