import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { FinanceBoard } from './finance-board';
import * as actions from './actions';
import type { FinanceEntryDTO } from '@/app/lib/finance-dto';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('./actions', () => ({ createFinanceEntry: vi.fn(), deleteFinanceEntry: vi.fn() }));

const plain = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

const entries: FinanceEntryDTO[] = [
  { id: 'a', type: 'EXPENSE', amount: 3000, category: 'Dining', note: 'Ramen', date: '2026-09-22' },
  { id: 'b', type: 'INCOME', amount: 100000, category: 'Salary', note: '', date: '2026-09-01' },
  { id: 'c', type: 'EXPENSE', amount: 50000, category: 'Housing', note: '', date: '2026-08-01' },
];

describe('FinanceBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-26T12:00:00'));
    window.alert = vi.fn();
    vi.mocked(actions.deleteFinanceEntry).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows the month label and only that month\'s totals and entries', () => {
    render(<FinanceBoard month="2026-09" entries={entries} />);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(plain(screen.getByTestId('fin-earned').textContent)).toBe('1 000 DA');
    expect(plain(screen.getByTestId('fin-spent').textContent)).toBe('30 DA');
    expect(screen.getByText('Ramen')).toBeInTheDocument();
    expect(screen.queryByText('Housing', { selector: '.pw-fin-row-text' })).not.toBeInTheDocument();
  });

  test('arrows and chart months navigate via ?month=', () => {
    render(<FinanceBoard month="2026-09" entries={entries} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(push).toHaveBeenLastCalledWith('/finance?month=2026-08');
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(push).toHaveBeenLastCalledWith('/finance?month=2026-10');
    fireEvent.click(screen.getByRole('button', { name: /^Jul/ }));
    expect(push).toHaveBeenLastCalledWith('/finance?month=2026-07');
  });

  test('the next arrow is disabled at 2100-12', () => {
    render(<FinanceBoard month="2100-12" entries={[]} />);
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  test('the previous arrow is disabled at 1900-01', () => {
    render(<FinanceBoard month="1900-01" entries={[]} />);
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  });

  test('logging an entry in the viewed month adds it to the list', async () => {
    vi.mocked(actions.createFinanceEntry).mockResolvedValue({ id: 'n', type: 'EXPENSE', amount: 1500, category: 'Groceries', note: 'Bread', date: '2026-09-26' });
    render(<FinanceBoard month="2026-09" entries={entries} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Bread' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Log entry' }));
    });
    expect(actions.createFinanceEntry).toHaveBeenCalledWith({ type: 'EXPENSE', amount: 1500, category: 'Groceries', note: 'Bread', date: '2026-09-26' });
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  test('logging an entry in another month navigates there', async () => {
    vi.mocked(actions.createFinanceEntry).mockResolvedValue({ id: 'n', type: 'EXPENSE', amount: 1500, category: 'Groceries', note: '', date: '2026-06-10' });
    render(<FinanceBoard month="2026-09" entries={entries} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-06-10' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Log entry' }));
    });
    expect(push).toHaveBeenCalledWith('/finance?month=2026-06');
  });

  test('a failed create alerts', async () => {
    vi.mocked(actions.createFinanceEntry).mockRejectedValue(new Error('boom'));
    render(<FinanceBoard month="2026-09" entries={entries} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Log entry' }));
    });
    expect(window.alert).toHaveBeenCalled();
    expect(screen.getByLabelText('Amount')).toHaveValue('15');
  });

  test('remove is optimistic and rolls back on failure', async () => {
    render(<FinanceBoard month="2026-09" entries={entries} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove Dining entry' }));
    });
    expect(actions.deleteFinanceEntry).toHaveBeenCalledWith('a');
    expect(screen.queryByText('Ramen')).not.toBeInTheDocument();

    vi.mocked(actions.deleteFinanceEntry).mockRejectedValue(new Error('boom'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove Salary entry' }));
    });
    expect(window.alert).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remove Salary entry' })).toBeInTheDocument();
  });
});
