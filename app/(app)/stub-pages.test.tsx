import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';
import JournalPage from './journal/page';

// Tasks, Matrix, Calendar, and Habits are no longer stub pages (see
// ./tasks/tasks-board.test.tsx, ./matrix/matrix-board.test.tsx,
// ./calendar/calendar-board.test.tsx, and ./habits/habits-board.test.tsx)
// so all four are intentionally excluded from this table-driven stub-page test.
const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
  { Component: JournalPage, heading: 'Journal' },
];

describe('stub route pages', () => {
  test.each(pages)('$heading page renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
