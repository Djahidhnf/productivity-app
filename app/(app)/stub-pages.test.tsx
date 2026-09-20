import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';
import CalendarPage from './calendar/page';
import MatrixPage from './matrix/page';
import HabitsPage from './habits/page';
import JournalPage from './journal/page';

// Tasks is no longer a stub page (see ./tasks/page.tsx and ./tasks/tasks-board.test.tsx)
// so it is intentionally excluded from this table-driven stub-page test.
const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
  { Component: CalendarPage, heading: 'Calendar' },
  { Component: MatrixPage, heading: 'Matrix' },
  { Component: HabitsPage, heading: 'Habits' },
  { Component: JournalPage, heading: 'Journal' },
];

describe('stub route pages', () => {
  test.each(pages)('$heading page renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
