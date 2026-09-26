import { describe, test, expect } from 'vitest';
import { habitColor } from './habit-color';

describe('habitColor', () => {
  test('maps a stored palette hex to its Still hue, case-insensitively', () => {
    expect(habitColor('#c6ff34')).toBe('var(--sage-500)');
    expect(habitColor('#60A5FA')).toBe('var(--mist-500)');
  });

  test('passes unknown colors through unchanged', () => {
    expect(habitColor('#123456')).toBe('#123456');
  });
});
