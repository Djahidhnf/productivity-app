import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { EntryForm } from './entry-form';

function setup(result = true) {
  const onSubmit = vi.fn().mockResolvedValue(result);
  render(<EntryForm defaultDate="2026-09-26" onSubmit={onSubmit} />);
  return onSubmit;
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Log entry' }));
  });
}

describe('EntryForm', () => {
  test('defaults to an expense in Groceries dated today', () => {
    setup();
    expect(screen.getByRole('tab', { name: 'Expense' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Category')).toHaveValue('Groceries');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-09-26');
  });

  test('switching to income swaps the categories and resets to Salary', () => {
    setup();
    fireEvent.click(screen.getByRole('tab', { name: 'Income' }));
    const category = screen.getByLabelText('Category');
    expect(category).toHaveValue('Salary');
    expect(screen.getByRole('option', { name: 'Freelance' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Groceries' })).not.toBeInTheDocument();
  });

  test('submits centimes, trimmed note and the chosen fields, then clears amount and note', async () => {
    const onSubmit = setup();
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1250,50' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Dining' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: '  Pizza ' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-20' } });
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ type: 'EXPENSE', amount: 125050, category: 'Dining', note: 'Pizza', date: '2026-09-20' });
    expect(screen.getByLabelText('Amount')).toHaveValue('');
    expect(screen.getByLabelText('Note')).toHaveValue('');
    expect(screen.getByLabelText('Category')).toHaveValue('Dining');
  });

  test('an invalid amount does not submit and focuses the amount', async () => {
    const onSubmit = setup();
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Amount')).toHaveFocus();
  });

  test('keeps the fields when the submit fails', async () => {
    setup(false);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    await submit();
    expect(screen.getByLabelText('Amount')).toHaveValue('10');
  });
});
