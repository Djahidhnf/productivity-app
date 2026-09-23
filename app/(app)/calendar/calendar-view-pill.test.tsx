import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CalendarViewPill } from './calendar-view-pill';

describe('CalendarViewPill', () => {
  test('renders all six view labels', () => {
    render(<CalendarViewPill value="day" onChange={vi.fn()} />);
    for (const label of ['Day', '3-Day', 'Week', 'Month', 'Year', 'Agenda']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  test('marks the current value as selected', () => {
    render(<CalendarViewPill value="week" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'false');
  });

  test('clicking a tab calls onChange with that view key', async () => {
    const onChange = vi.fn();
    render(<CalendarViewPill value="day" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    expect(onChange).toHaveBeenCalledWith('month');
  });
});
