'use client';

export interface PillOption<T extends string> {
  value: T;
  label: string;
}

export interface PillToggleProps<T extends string> {
  options: readonly PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function PillToggle<T extends string>({ options, value, onChange, ariaLabel }: PillToggleProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{ display: 'inline-flex', gap: 2, padding: 4, borderRadius: 'var(--radius-pill)', background: 'var(--surface-3)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              appearance: 'none',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              padding: '7px 14px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 'var(--weight-medium)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              color: active ? 'var(--on-accent)' : 'var(--text-secondary)',
              background: active ? 'var(--accent)' : 'transparent',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
