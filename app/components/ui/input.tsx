import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  size?: 'sm' | 'md';
  /** Borderless, for inline "add" rows that sit on a hairline. */
  variant?: 'outlined' | 'bare';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, size = 'md', variant = 'outlined', id, style, className, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const bare = variant === 'bare';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-2)' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={[bare ? 'st-input-bare' : 'st-input', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        style={bare ? style : { height: size === 'sm' ? 30 : 36, padding: size === 'sm' ? '0 10px' : '0 12px', fontSize: size === 'sm' ? 13 : 14, ...style }}
        {...rest}
      />
      {error && (
        <span role="alert" style={{ fontSize: 12, color: 'var(--danger-fg)' }}>
          {error}
        </span>
      )}
    </div>
  );
});
