import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';

// Tasks, Matrix, Calendar, Habits, Notes and Finance are real pages with their
// own board tests, so they are intentionally excluded from this table-driven
// stub-page test. Dashboard is deferred and is the only stub remaining.
const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
];

describe('stub route pages', () => {
  test.each(pages)('$heading page renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
