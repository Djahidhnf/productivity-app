import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { NewListColumn } from './new-list-column';

describe('NewListColumn', () => {
  test('typing a name and submitting calls onCreate and clears the field', async () => {
    const onCreate = vi.fn();
    render(<NewListColumn onCreate={onCreate} />);
    const input = screen.getByPlaceholderText('New list…');
    await userEvent.type(input, 'Groceries{Enter}');
    expect(onCreate).toHaveBeenCalledWith('Groceries');
    expect(input).toHaveValue('');
  });

  test('submitting an empty name does not call onCreate', async () => {
    const onCreate = vi.fn();
    render(<NewListColumn onCreate={onCreate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add list' }));
    expect(onCreate).not.toHaveBeenCalled();
  });
});
