import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { BUTTON_VARIANT_STYLES, type ButtonVariant } from './button-variants';

type Size = 'sm' | 'md';

const dimensions: Record<Size, number> = { sm: 32, md: 40 };

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  size?: Size;
  children: ReactNode;
}

export function IconButton({ label, variant = 'secondary', size = 'md', style, children, type, ...rest }: IconButtonProps) {
  const dimension = dimensions[size];
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      style={{
        width: dimension,
        height: dimension,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        border: '1px solid transparent',
        cursor: 'pointer',
        ...BUTTON_VARIANT_STYLES[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
