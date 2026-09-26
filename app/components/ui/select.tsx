import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { Icon } from '@/app/components/icons';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label htmlFor={selectId} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-2)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select id={selectId} ref={ref} className="st-input st-select" style={style} {...rest}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Icon name="chevrons-up-down" size={15} style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: 'var(--fg-3)' }} />
      </div>
    </div>
  );
});
