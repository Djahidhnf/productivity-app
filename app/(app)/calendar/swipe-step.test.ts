import { describe, test, expect } from 'vitest';
import { swipeStepDays } from './calendar-views';

describe('swipeStepDays', () => {
  test('a short swipe is always 1 day', () => {
    for (const view of ['day', '3day', 'week'] as const) {
      expect(swipeStepDays(view, 'short')).toBe(1);
    }
  });

  test('a long swipe moves the full step of the view', () => {
    expect(swipeStepDays('day', 'long')).toBe(1);
    expect(swipeStepDays('3day', 'long')).toBe(3);
    expect(swipeStepDays('week', 'long')).toBe(7);
  });
});
