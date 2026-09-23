'use client';

import { Button } from '@/app/components/ui/button';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';

export interface JournalHeaderProps {
  dateLabel: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}

export function JournalHeader({ dateLabel, onPrev, onToday, onNext }: JournalHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--weight-semibold)',
          letterSpacing: 'var(--tracking-tight)',
          fontSize: 'var(--text-lg)',
        }}
      >
        {dateLabel}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconButton variant="outline" onClick={onPrev} label="Previous day">
          <Icon name="left" size={16} />
        </IconButton>
        <Button variant="secondary" onClick={onToday}>
          Today
        </Button>
        <IconButton variant="outline" onClick={onNext} label="Next day">
          <Icon name="right" size={16} />
        </IconButton>
      </div>
    </header>
  );
}
