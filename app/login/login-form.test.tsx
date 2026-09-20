import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { LoginForm } from '@/app/login/login-form';
import type { LoginState } from '@/app/login/actions';

describe('LoginForm', () => {
  test('renders email and password fields and a submit button', () => {
    render(<LoginForm action={vi.fn(async (): Promise<LoginState> => undefined)} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows the error message returned by the action', async () => {
    const action = vi.fn(async (): Promise<LoginState> => ({ error: 'Incorrect email or password.' }));
    render(<LoginForm action={action} />);

    await userEvent.type(screen.getByLabelText('Email'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });
});
