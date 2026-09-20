import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { IconButton } from '@/app/components/ui/icon-button';

describe('IconButton', () => {
  test('exposes the label as an accessible name', () => {
    render(<IconButton label="Add task"><span>+</span></IconButton>);
    expect(screen.getByRole('button', { name: 'Add task' })).toBeInTheDocument();
  });

  test('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<IconButton label="Add task" onClick={onClick}><span>+</span></IconButton>);
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('sm and md sizes render different dimensions', () => {
    const { rerender } = render(<IconButton label="X" size="sm"><span>+</span></IconButton>);
    const smWidth = screen.getByRole('button').style.width;
    rerender(<IconButton label="X" size="md"><span>+</span></IconButton>);
    const mdWidth = screen.getByRole('button').style.width;
    expect(smWidth).not.toBe(mdWidth);
  });
});
