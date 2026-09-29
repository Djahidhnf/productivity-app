import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CalendarHeader } from './calendar-header';

describe('CalendarHeader', () => {
  test('renders the given title', () => {
    render(<CalendarHeader title="Today" onPrev={vi.fn()} onToday={vi.fn()} onNext={vi.fn()} onNewTask={vi.fn()} />);
    const titleElement = screen.getByRole('heading', { level: 1, name: 'Today' });
    expect(titleElement).toBeInTheDocument();
  });

  test('Prev/Next/New task buttons and the title call their handlers', async () => {
    const onPrev = vi.fn();
    const onToday = vi.fn();
    const onNext = vi.fn();
    const onNewTask = vi.fn();
    render(<CalendarHeader title="Today" onPrev={onPrev} onToday={onToday} onNext={onNext} onNewTask={onNewTask} />);
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPrev).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNext).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'New task' }));
    expect(onNewTask).toHaveBeenCalled();
    await userEvent.click(screen.getByTitle('Back to today'));
    expect(onToday).toHaveBeenCalled();
    // The title is the only way back to today: there is no separate Today button.
    expect(screen.getAllByRole('button', { name: 'Today' })).toHaveLength(1);
  });
});

describe('CalendarHeader picker', () => {
  test('without a picker the title is a back-to-today button, not a jump picker', async () => {
    const onToday = vi.fn();
    render(<CalendarHeader title="Sep 23 – Sep 25" onPrev={vi.fn()} onToday={onToday} onNext={vi.fn()} onNewTask={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sep 23 – Sep 25' }));
    expect(onToday).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
  });

  test('the jump picker has a Today button that jumps back and closes it', async () => {
    const onToday = vi.fn();
    render(
      <CalendarHeader
        title="September 2026"
        onPrev={vi.fn()}
        onToday={onToday}
        onNext={vi.fn()}
        onNewTask={vi.fn()}
        picker={{ mode: 'month', value: '2026-09-23', onPick: vi.fn() }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /September 2026/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
  });

  test('with a picker the title is a button that opens the jump dialog and closes after picking', async () => {
    const onPick = vi.fn();
    render(
      <CalendarHeader
        title="September 2026"
        onPrev={vi.fn()}
        onToday={vi.fn()}
        onNext={vi.fn()}
        onNewTask={vi.fn()}
        picker={{ mode: 'month', value: '2026-09-23', onPick }}
      />
    );
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /September 2026/ }));
    expect(screen.getByRole('dialog', { name: 'Jump to date' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Feb' }));
    expect(onPick).toHaveBeenCalledWith('2026-02-01');
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
  });
});
