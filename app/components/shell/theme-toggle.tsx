'use client';

import { createContext, useContext } from 'react';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';

export interface ThemeControl {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

/** Provided by AppShell, which owns the theme. */
export const ThemeContext = createContext<ThemeControl | null>(null);

/** Sun/moon button that flips the app theme. Renders nothing outside AppShell. */
export function ThemeToggle({ className }: { className?: string }) {
  const control = useContext(ThemeContext);
  if (!control) return null;
  return (
    <IconButton label="Toggle theme" className={className} onClick={control.toggleTheme}>
      <Icon name={control.theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </IconButton>
  );
}
