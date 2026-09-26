import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { BUTTON_VARIANT_STYLES, type ButtonVariant } from './button-variants';

type Size = 'sm' | 'md';

const sizes: Record<Size, CSSProperties> = {
  sm: { height: 28, padding: '0 10px', fontSize: 13, gap: 6 },
  md: { height: 34, padding: '0 14px', fontSize: 14, gap: 8 },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', style, children, type, className, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={className ? `st-btn ${className}` : 'st-btn'}
      style={{ ...sizes[size], ...BUTTON_VARIANT_STYLES[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
