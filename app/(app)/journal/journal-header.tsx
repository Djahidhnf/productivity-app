'use client';

import { Button } from '@/app/components/ui/button';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { PageHeader } from '@/app/components/shell/page-header';

export interface JournalHeaderProps {
  dateLabel: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}

export function JournalHeader({ dateLabel, onPrev, onToday, onNext }: JournalHeaderProps) {
  return (
    <PageHeader
      title="Journal"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onToday}>
            Today
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconButton onClick={onPrev} label="Previous day">
              <Icon name="left" size={18} />
            </IconButton>
            <span style={{ minWidth: 112, textAlign: 'center', fontWeight: 500 }}>{dateLabel}</span>
            <IconButton onClick={onNext} label="Next day">
              <Icon name="right" size={18} />
            </IconButton>
          </div>
        </>
      }
    />
  );
}
