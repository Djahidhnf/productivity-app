'use client';

import { Icon } from '@/app/components/icons';
import { IconButton } from '@/app/components/ui/icon-button';

export interface MonthSwitcherProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}

export function MonthSwitcher({ label, onPrev, onNext, prevDisabled, nextDisabled }: MonthSwitcherProps) {
  return (
    <div className="pw-fin-switcher">
      <IconButton label="Previous month" onClick={onPrev} disabled={prevDisabled}>
        <Icon name="left" size={16} />
      </IconButton>
      <span className="pw-fin-switcher-label">{label}</span>
      <IconButton label="Next month" onClick={onNext} disabled={nextDisabled}>
        <Icon name="right" size={16} />
      </IconButton>
    </div>
  );
}
