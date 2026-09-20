import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Dialog } from '@/app/components/ui/dialog';

describe('Dialog', () => {
  test('renders nothing when closed', () => {
    render(<Dialog open={false} onClose={vi.fn()} title="Edit task">content</Dialog>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders the title and children when open', () => {
    render(<Dialog open onClose={vi.fn()} title="Edit task"><p>content</p></Dialog>);
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  test('calls onClose when the overlay is clicked', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Edit task"><p>content</p></Dialog>);
    await userEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('does not call onClose when the panel itself is clicked', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Edit task"><p>content</p></Dialog>);
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  test('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Edit task"><p>content</p></Dialog>);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Edit task"><p>content</p></Dialog>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
