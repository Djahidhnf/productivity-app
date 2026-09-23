import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';
import HabitsPage from './habits/page';
import JournalPage from './journal/page';

// Tasks, Matrix, and Calendar are no longer stub pages (see
// ./tasks/tasks-board.test.tsx, ./matrix/matrix-board.test.tsx, and
// ./calendar/calendar-board.test.tsx) so all three are intentionally
// excluded from this table-driven stub-page test.
const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
  { Component: HabitsPage, heading: 'Habits' },
  { Component: JournalPage, heading: 'Journal' },
];

describe('stub route pages', () => {
  test.each(pages)('$heading page renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
