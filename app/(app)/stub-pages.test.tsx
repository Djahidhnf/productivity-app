import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';

// Tasks, Matrix, Calendar, Habits, and Journal are no longer stub pages (see
// ./tasks/tasks-board.test.tsx, ./matrix/matrix-board.test.tsx,
// ./calendar/calendar-board.test.tsx, ./habits/habits-board.test.tsx, and
// ./journal/journal-board.test.tsx) so all five are intentionally excluded
// from this table-driven stub-page test. Dashboard is built last, per the
// rollout plan, and is the only page remaining here.
const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
];

describe('stub route pages', () => {
  test.each(pages)('$heading page renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
