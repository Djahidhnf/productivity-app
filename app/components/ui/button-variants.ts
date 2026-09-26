import type { CSSProperties } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'accent';

// Colors go through custom properties so the .st-btn rules in layout.css can
// swap in the hover values. Primary is ink, not accent: in the Still system
// the sage accent is reserved for checked state, progress and focus.
function variant(bg: string, hover: string, fg: string, border: string, hoverFg = fg): CSSProperties {
  return { '--btn-bg': bg, '--btn-hover': hover, '--btn-fg': fg, '--btn-hover-fg': hoverFg, '--btn-border': border } as CSSProperties;
}

export const BUTTON_VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: variant('var(--surface-inverse)', 'var(--surface-inverse-hover)', 'var(--fg-inverse)', 'transparent'),
  secondary: variant('var(--surface-1)', 'var(--surface-hover)', 'var(--fg-1)', 'var(--border-2)'),
  ghost: variant('transparent', 'var(--surface-hover)', 'var(--fg-2)', 'transparent', 'var(--fg-1)'),
  outline: variant('transparent', 'var(--surface-hover)', 'var(--fg-1)', 'var(--border-2)'),
  accent: variant('var(--accent)', 'var(--accent-hover)', 'var(--accent-fg)', 'transparent'),
};
