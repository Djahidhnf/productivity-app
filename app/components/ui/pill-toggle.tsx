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
  fullWidth?: boolean;
}

/** The Still segmented control: a sunken track with the active item raised. */
export function PillToggle<T extends string>({ options, value, onChange, ariaLabel, fullWidth }: PillToggleProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="st-seg" data-full={fullWidth || undefined}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
