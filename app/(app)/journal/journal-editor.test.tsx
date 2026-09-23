import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { JournalEditor } from './journal-editor';

describe('JournalEditor', () => {
  test('renders the current mood as selected and the current text', () => {
    render(<JournalEditor mood="GOOD" text="Feeling okay" onMoodChange={vi.fn()} onTextChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Good' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByPlaceholderText('Write about your day…')).toHaveValue('Feeling okay');
  });

  test('calls onMoodChange with the raw enum value when a different mood pill is clicked', () => {
    const onMoodChange = vi.fn();
    render(<JournalEditor mood="OKAY" text="" onMoodChange={onMoodChange} onTextChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Rough' }));
    expect(onMoodChange).toHaveBeenCalledWith('ROUGH');
  });

  test('calls onTextChange as the user types', () => {
    const onTextChange = vi.fn();
    render(<JournalEditor mood="OKAY" text="" onMoodChange={vi.fn()} onTextChange={onTextChange} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'New text' } });
    expect(onTextChange).toHaveBeenCalledWith('New text');
  });
});
