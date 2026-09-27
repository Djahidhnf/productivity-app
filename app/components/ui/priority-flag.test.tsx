import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { PriorityFlag, PRIORITY_COLORS, PRIORITY_ON_COLORS } from './priority-flag';

describe('PriorityFlag', () => {
  test('renders with an accessible label naming the priority', () => {
    render(<PriorityFlag priority="RED" />);
    expect(screen.getByRole('img', { name: 'Priority: red' })).toBeInTheDocument();
  });

  test('uses the correct color per priority', () => {
    (['RED', 'AMBER', 'BLUE', 'GREEN'] as const).forEach((priority) => {
      const { unmount } = render(<PriorityFlag priority={priority} />);
      const mark = screen.getByRole('img', { name: `Priority: ${priority.toLowerCase()}` });
      expect(mark.style.background).toBe(PRIORITY_COLORS[priority]);
      unmount();
    });
  });
});

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
