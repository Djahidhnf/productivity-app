import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Input } from '@/app/components/ui/input';

describe('Input', () => {
  test('associates the label with the input', () => {
    render(<Input label="Task" placeholder="What needs doing?" onChange={() => {}} />);
    expect(screen.getByLabelText('Task')).toBeInTheDocument();
  });

  test('calls onChange as the user types', async () => {
    const onChange = vi.fn();
    render(<Input label="Task" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Task'), 'Buy milk');
    expect(onChange).toHaveBeenCalled();
  });

  test('renders an error message with role="alert"', () => {
    render(<Input label="Task" error="Required" onChange={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });
});
