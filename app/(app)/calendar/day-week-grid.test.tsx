import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { DayWeekGrid } from './day-week-grid';

describe('DayWeekGrid skeleton', () => {
  test('renders one day-header column per date key', () => {
    render(<DayWeekGrid dateKeys={['2026-09-23', '2026-09-24', '2026-09-25']} />);
    // Each date's day-of-month number should appear once in the header.
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  test('renders 24 hour separator lines regardless of visible day count', () => {
    const { container } = render(<DayWeekGrid dateKeys={['2026-09-23']} />);
    expect(container.querySelectorAll('.pw-calgrid-hourline')).toHaveLength(24);
  });

  test('renders one grid column per date key, each tagged with its date', () => {
    const { container } = render(<DayWeekGrid dateKeys={['2026-09-23', '2026-09-24']} />);
    const cols = container.querySelectorAll('[data-daykey]');
    expect(Array.from(cols).map((el) => el.getAttribute('data-daykey'))).toEqual(['2026-09-23', '2026-09-24']);
  });
});
