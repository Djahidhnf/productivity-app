'use client';

import type { JournalHistoryItem } from './journal-views';

export interface JournalHistoryProps {
  items: JournalHistoryItem[];
  onOpen: (date: string) => void;
}

export function JournalHistory({ items, onOpen }: JournalHistoryProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 className="st-label">Past entries</h2>
      {items.map((item) => (
        <div key={item.date} className="pw-journal-entry" onClick={() => onOpen(item.date)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 500 }}>{item.dateLabel}</span>
            <span className="st-eyebrow">{item.moodLabel}</span>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--fg-2)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
            {item.preview}
          </p>
        </div>
      ))}
      {items.length === 0 && <p className="st-empty" style={{ margin: 0 }}>Past entries will show up here.</p>}
    </div>
  );
}
