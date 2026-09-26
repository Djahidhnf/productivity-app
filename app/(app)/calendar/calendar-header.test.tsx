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

  test('Prev/Today/Next/New task buttons call their handlers in order', async () => {
    const onPrev = vi.fn();
    const onToday = vi.fn();
    const onNext = vi.fn();
    const onNewTask = vi.fn();
    render(<CalendarHeader title="Today" onPrev={onPrev} onToday={onToday} onNext={onNext} onNewTask={onNewTask} />);
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPrev).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNext).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'New task' }));
    expect(onNewTask).toHaveBeenCalled();
  });
});

describe('CalendarHeader picker', () => {
  test('without a picker the title is plain text, not a button', () => {
    render(<CalendarHeader title="September 2026" onPrev={vi.fn()} onToday={vi.fn()} onNext={vi.fn()} onNewTask={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /September 2026/ })).not.toBeInTheDocument();
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
