import { describe, test, expect } from 'vitest';
import { truncatePreview, MOOD_LABELS, buildJournalHistory } from './journal-views';
import type { JournalEntryDTO } from '@/app/lib/journal-dto';

describe('truncatePreview', () => {
  test('returns the text unchanged when at or under the limit', () => {
    expect(truncatePreview('short text', 140)).toBe('short text');
    expect(truncatePreview('a'.repeat(140), 140)).toBe('a'.repeat(140));
  });

  test('truncates and appends an ellipsis when over the limit', () => {
    const long = 'a'.repeat(141);
    expect(truncatePreview(long, 140)).toBe('a'.repeat(140) + '…');
  });

  test('defaults to a 140-character limit', () => {
    const long = 'b'.repeat(150);
    expect(truncatePreview(long)).toBe('b'.repeat(140) + '…');
  });
});

describe('MOOD_LABELS', () => {
  test('has a friendly label for every mood', () => {
    expect(MOOD_LABELS).toEqual({ GREAT: 'Great', GOOD: 'Good', OKAY: 'Okay', LOW: 'Low', ROUGH: 'Rough' });
  });
});

describe('buildJournalHistory', () => {
  const entries: JournalEntryDTO[] = [
    { date: '2026-09-20', text: 'Older entry', mood: 'OKAY' },
    { date: '2026-09-22', text: 'Newer entry', mood: 'GOOD' },
    { date: '2026-09-23', text: 'Today, should be excluded', mood: 'GREAT' },
    { date: '2026-09-19', text: '', mood: 'LOW' },
  ];

  test('excludes the current date and empty-text entries, sorts newest first', () => {
    const result = buildJournalHistory(entries, '2026-09-23', '2026-09-23');
    expect(result.map((r) => r.date)).toEqual(['2026-09-22', '2026-09-20']);
  });

  test('formats each item with a date label, mood label, and preview', () => {
    const result = buildJournalHistory(entries, '2026-09-23', '2026-09-23');
    expect(result[0]).toEqual({
      date: '2026-09-22',
      dateLabel: 'Yesterday',
      moodLabel: 'Good',
      preview: 'Newer entry',
    });
  });

  test('is unaffected by which date is "current" when checking a non-adjacent date', () => {
    const result = buildJournalHistory(
      [{ date: '2026-09-22', text: 'x', mood: 'OKAY' }],
      '2026-09-10',
      '2026-09-23'
    );
    expect(result[0].dateLabel).toBe('Yesterday');
  });
});
