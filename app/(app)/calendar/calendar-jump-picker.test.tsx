import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CalendarJumpPicker } from './calendar-jump-picker';

describe('CalendarJumpPicker (month mode)', () => {
  test('shows the current year and 12 month buttons', () => {
    render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Jump to date' })).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toHaveValue('2026');
    for (const label of ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Go' })).not.toBeInTheDocument();
  });

  test('picking a month uses the year in the field', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mar' }));
    expect(onPick).toHaveBeenCalledWith('2026-03-01');

    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2030');
    await userEvent.click(screen.getByRole('button', { name: 'Jan' }));
    expect(onPick).toHaveBeenLastCalledWith('2030-01-01');
  });

  test('the year buttons step the year, and out-of-range years are clamped to 1900–2100', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(screen.getByLabelText('Year')).toHaveValue('2027');
    await userEvent.click(screen.getByRole('button', { name: 'Previous year' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous year' }));
    expect(screen.getByLabelText('Year')).toHaveValue('2025');

    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '1800');
    await userEvent.click(screen.getByRole('button', { name: 'Jun' }));
    expect(onPick).toHaveBeenLastCalledWith('1900-06-01');

    await userEvent.clear(year);
    await userEvent.type(year, '2500');
    await userEvent.click(screen.getByRole('button', { name: 'Jun' }));
    expect(onPick).toHaveBeenLastCalledWith('2100-06-01');
  });

  test('month buttons are disabled while the year field is not a number', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText('Year'));
    expect(screen.getByRole('button', { name: 'Jan' })).toBeDisabled();
  });

  test('month buttons stay disabled until the year field holds a full four-digit year', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '20');
    expect(screen.getByRole('button', { name: 'Jan' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Jan' }));
    expect(onPick).not.toHaveBeenCalled();
    await userEvent.type(year, '26');
    expect(year).toHaveValue('2026');
    expect(screen.getByRole('button', { name: 'Jan' })).toBeEnabled();
  });

  test('Escape and a backdrop click close it', async () => {
    const onClose = vi.fn();
    const { container } = render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={vi.fn()} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(container.querySelector('.pw-jump-backdrop') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('CalendarJumpPicker (year mode)', () => {
  test('has no month buttons; Go picks January 1 of the typed year', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="year" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Jan' })).not.toBeInTheDocument();
    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2031');
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onPick).toHaveBeenCalledWith('2031-01-01');
  });

  test('pressing Enter in the year field also picks', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="year" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2040{Enter}');
    expect(onPick).toHaveBeenCalledWith('2040-01-01');
  });
});
