import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { BUTTON_VARIANT_STYLES, type ButtonVariant } from './button-variants';

type Size = 'sm' | 'md';

const base: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--weight-medium)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: '1px solid transparent',
};

const sizes: Record<Size, CSSProperties> = {
  sm: { height: 32, padding: '0 12px', fontSize: 'var(--text-xs)' },
  md: { height: 40, padding: '0 16px', fontSize: 'var(--text-sm)' },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', style, children, type, ...rest }: ButtonProps) {
  return (
    <button type={type ?? 'button'} style={{ ...base, ...sizes[size], ...BUTTON_VARIANT_STYLES[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}
