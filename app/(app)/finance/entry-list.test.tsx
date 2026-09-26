import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { EntryList } from './entry-list';
import type { DayGroup } from './finance-views';

const plain = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

const groups: DayGroup[] = [
  {
    date: '2026-09-22',
    label: 'Yesterday',
    total: 97000,
    entries: [
      { id: 'a', type: 'EXPENSE', amount: 3000, category: 'Dining', note: 'Ramen', date: '2026-09-22' },
      { id: 'b', type: 'INCOME', amount: 100000, category: 'Salary', note: '', date: '2026-09-22' },
    ],
  },
];

describe('EntryList', () => {
  test('shows the count, day label and signed total, and each entry', () => {
    render(<EntryList groups={groups} count={2} onDelete={vi.fn()} />);
    expect(screen.getByText('Entries')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(plain(screen.getByTestId('day-total-2026-09-22').textContent)).toBe('+970 DA');
    expect(screen.getByText('Ramen')).toBeInTheDocument();
    expect(plain(screen.getByTestId('amount-a').textContent)).toBe('−30 DA');
    const income = screen.getByTestId('amount-b');
    expect(plain(income.textContent)).toBe('+1 000 DA');
    expect(income).toHaveAttribute('data-income');
  });

  test('remove calls onDelete with the id', () => {
    const onDelete = vi.fn();
    render(<EntryList groups={groups} count={2} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Dining entry' }));
    expect(onDelete).toHaveBeenCalledWith('a');
  });

  test('empty month message', () => {
    render(<EntryList groups={[]} count={0} onDelete={vi.fn()} />);
    expect(screen.getByText('Nothing logged this month.')).toBeInTheDocument();
  });
});
