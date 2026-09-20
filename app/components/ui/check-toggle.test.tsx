import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CheckToggle } from '@/app/components/ui/check-toggle';

describe('CheckToggle', () => {
  test('reflects the checked state via aria-checked', () => {
    const { rerender } = render(<CheckToggle checked={false} onToggle={vi.fn()} label="Buy milk" />);
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toHaveAttribute('aria-checked', 'false');
    rerender(<CheckToggle checked onToggle={vi.fn()} label="Buy milk" />);
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toHaveAttribute('aria-checked', 'true');
  });

  test('calls onToggle once and does not bubble to a parent click handler', async () => {
    const onToggle = vi.fn();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <CheckToggle checked={false} onToggle={onToggle} label="Buy milk" />
      </div>
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Buy milk' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
