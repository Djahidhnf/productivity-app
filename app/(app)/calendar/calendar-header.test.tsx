import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CalendarHeader } from './calendar-header';

describe('CalendarHeader', () => {
  test('renders the given title', () => {
    render(<CalendarHeader title="Today" onPrev={vi.fn()} onToday={vi.fn()} onNext={vi.fn()} onNewTask={vi.fn()} />);
    const titleElement = screen.getAllByText('Today').find((el) => el.tagName === 'SPAN');
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
