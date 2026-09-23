import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { JournalHeader } from './journal-header';

describe('JournalHeader', () => {
  test('renders the date label and calls each handler', () => {
    const onPrev = vi.fn();
    const onToday = vi.fn();
    const onNext = vi.fn();
    render(<JournalHeader dateLabel="Wed, Sep 23" onPrev={onPrev} onToday={onToday} onNext={onNext} />);
    expect(screen.getByText('Wed, Sep 23')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Previous day'));
    expect(onPrev).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Next day'));
    expect(onNext).toHaveBeenCalled();
  });
});
