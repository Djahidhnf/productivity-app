import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { PillToggle } from '@/app/components/ui/pill-toggle';

const options = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
] as const;

describe('PillToggle', () => {
  test('marks the active option as selected', () => {
    render(<PillToggle options={options} value="day" onChange={vi.fn()} ariaLabel="Calendar view" />);
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'false');
  });

  test('calls onChange with the clicked option value', async () => {
    const onChange = vi.fn();
    render(<PillToggle options={options} value="day" onChange={onChange} ariaLabel="Calendar view" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    expect(onChange).toHaveBeenCalledWith('week');
  });
});
