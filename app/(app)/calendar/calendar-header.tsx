'use client';

import { Button } from '@/app/components/ui/button';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';

export interface CalendarHeaderProps {
  title: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onNewTask: () => void;
}

export function CalendarHeader({ title, onPrev, onToday, onNext, onNewTask }: CalendarHeaderProps) {
  return (
    <header
      className="pw-calhead"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-3)',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        padding: '0 clamp(16px, 3vw, 32px)',
        flex: 'none',
      }}
    >
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lg)' }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <IconButton variant="outline" onClick={onPrev} label="Previous">
          <Icon name="left" size={16} />
        </IconButton>
        <Button variant="secondary" onClick={onToday}>
          Today
        </Button>
        <IconButton variant="outline" onClick={onNext} label="Next">
          <Icon name="right" size={16} />
        </IconButton>
        <Button variant="primary" onClick={onNewTask}>
          New task
        </Button>
      </div>
    </header>
  );
}
