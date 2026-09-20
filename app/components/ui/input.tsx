import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  size?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, size = 'md', id, style, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const height = size === 'sm' ? 32 : 40;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        style={{
          height,
          width: '100%',
          boxSizing: 'border-box',
          padding: '0 12px',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          outline: 'none',
          ...style,
        }}
        {...rest}
      />
      {error && (
        <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>
          {error}
        </span>
      )}
    </div>
  );
});
