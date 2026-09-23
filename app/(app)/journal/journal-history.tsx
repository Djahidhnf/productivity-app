'use client';

import type { JournalHistoryItem } from './journal-views';

export interface JournalHistoryProps {
  items: JournalHistoryItem[];
  onOpen: (date: string) => void;
}

export function JournalHistory({ items, onOpen }: JournalHistoryProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <h4
        style={{
          margin: '0 0 var(--space-1)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase',
          fontWeight: 'var(--weight-medium)',
        }}
      >
        Past entries
      </h4>
      {items.map((item) => (
        <div
          key={item.date}
          onClick={() => onOpen(item.date)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 'var(--space-4)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
              {item.dateLabel}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-2xs)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {item.moodLabel}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-normal)' }}>
            {item.preview}
          </p>
        </div>
      ))}
      {items.length === 0 && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Past entries will show up here.</p>
      )}
    </div>
  );
}
