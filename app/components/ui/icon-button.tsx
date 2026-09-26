import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { BUTTON_VARIANT_STYLES, type ButtonVariant } from './button-variants';

type Size = 'sm' | 'md';

const dimensions: Record<Size, number> = { sm: 28, md: 34 };

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  size?: Size;
  children: ReactNode;
}

export function IconButton({ label, variant = 'ghost', size = 'md', style, children, type, className, ...rest }: IconButtonProps) {
  const dimension = dimensions[size];
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={className ? `st-btn st-iconbtn ${className}` : 'st-btn st-iconbtn'}
      style={{ width: dimension, height: dimension, padding: 0, ...BUTTON_VARIANT_STYLES[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
