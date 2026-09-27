import { describe, test, expect } from 'vitest';
import { PRIORITY_COLORS, PRIORITY_ON_COLORS } from './priority-flag';

describe('priority colors', () => {
  test('map the four priorities to red, yellow, blue and green', () => {
    expect(PRIORITY_COLORS).toEqual({
      RED: 'var(--prio-red)',
      AMBER: 'var(--prio-yellow)',
      BLUE: 'var(--prio-blue)',
      GREEN: 'var(--prio-green)',
    });
  });

  test('use dark text on yellow and white text on the others', () => {
    expect(PRIORITY_ON_COLORS).toEqual({
      RED: 'var(--prio-on-dark)',
      AMBER: 'var(--prio-on-light)',
      BLUE: 'var(--prio-on-dark)',
      GREEN: 'var(--prio-on-dark)',
    });
  });
});
