import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { JournalHistory } from './journal-history';
import type { JournalHistoryItem } from './journal-views';

const items: JournalHistoryItem[] = [
  { date: '2026-09-22', dateLabel: 'Yesterday', moodLabel: 'Good', preview: 'Newer entry' },
  { date: '2026-09-20', dateLabel: 'Sun, Sep 20', moodLabel: 'Okay', preview: 'Older entry' },
];

describe('JournalHistory', () => {
  test('renders one card per item', () => {
    render(<JournalHistory items={items} onOpen={vi.fn()} />);
    expect(screen.getByText('Newer entry')).toBeInTheDocument();
    expect(screen.getByText('Older entry')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  test('shows the empty state when there are no items', () => {
    render(<JournalHistory items={[]} onOpen={vi.fn()} />);
    expect(screen.getByText('Past entries will show up here.')).toBeInTheDocument();
  });

  test('clicking a card calls onOpen with its date', () => {
    const onOpen = vi.fn();
    render(<JournalHistory items={items} onOpen={onOpen} />);
    fireEvent.click(screen.getByText('Newer entry'));
    expect(onOpen).toHaveBeenCalledWith('2026-09-22');
  });
});
