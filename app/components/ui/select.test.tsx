import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Select } from '@/app/components/ui/select';

const options = [
  { value: 'work', label: 'Work' },
  { value: 'home', label: 'Home' },
];

describe('Select', () => {
  test('associates the label and lists every option', () => {
    render(<Select label="List" options={options} onChange={() => {}} value="work" />);
    const select = screen.getByLabelText('List');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Home' })).toBeInTheDocument();
  });

  test('calls onChange when a different option is picked', async () => {
    const onChange = vi.fn();
    render(<Select label="List" options={options} onChange={onChange} value="work" />);
    await userEvent.selectOptions(screen.getByLabelText('List'), 'home');
    expect(onChange).toHaveBeenCalled();
  });
});
