import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, id, style, ...rest },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {label && (
        <label htmlFor={selectId} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        style={{
          height: 40,
          width: '100%',
          boxSizing: 'border-box',
          padding: '0 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          outline: 'none',
          ...style,
        }}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
});
