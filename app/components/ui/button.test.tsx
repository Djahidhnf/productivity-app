import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Button } from '@/app/components/ui/button';

describe('Button', () => {
  test('renders its children and defaults to type="button"', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  test('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('is disabled when the disabled prop is set', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('primary and secondary variants render different backgrounds', () => {
    const { rerender } = render(<Button variant="primary">Go</Button>);
    const primaryBg = screen.getByRole('button').style.background;
    rerender(<Button variant="secondary">Go</Button>);
    const secondaryBg = screen.getByRole('button').style.background;
    expect(primaryBg).not.toBe(secondaryBg);
  });
});
