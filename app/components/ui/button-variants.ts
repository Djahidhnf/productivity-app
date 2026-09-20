import type { CSSProperties } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

export const BUTTON_VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'var(--accent)', color: 'var(--on-accent)' },
  secondary: { background: 'var(--surface-3)', color: 'var(--text-primary)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)' },
  outline: { background: 'transparent', color: 'var(--text-primary)', borderColor: 'var(--border-strong)' },
};
