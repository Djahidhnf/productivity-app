import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { PriorityFlag, PRIORITY_COLORS } from '@/app/components/ui/priority-flag';

describe('PriorityFlag', () => {
  test('renders with an accessible label naming the priority', () => {
    render(<PriorityFlag priority="RED" />);
    expect(screen.getByRole('img', { name: 'Priority: red' })).toBeInTheDocument();
  });

  test('uses the correct color per priority', () => {
    (['RED', 'AMBER', 'BLUE', 'GREEN'] as const).forEach((priority) => {
      const { unmount } = render(<PriorityFlag priority={priority} />);
      const svg = screen.getByRole('img', { name: `Priority: ${priority.toLowerCase()}` });
      expect(svg).toHaveAttribute('stroke', PRIORITY_COLORS[priority]);
      unmount();
    });
  });
});
