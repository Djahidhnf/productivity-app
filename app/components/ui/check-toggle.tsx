'use client';

export interface CheckToggleProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  accentColor?: string;
  /** Round for tasks, square (the default) for habits, per the Still checkbox. */
  shape?: 'round' | 'square';
  size?: 'sm' | 'md';
}

export function CheckToggle({ checked, onToggle, label, accentColor, shape = 'square', size = 'md' }: CheckToggleProps) {
  const box = size === 'sm' ? 16 : 18;
  const fill = accentColor ?? 'var(--accent)';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="st-check"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{
        width: box,
        height: box,
        borderRadius: shape === 'round' ? '50%' : 5,
        borderColor: checked ? fill : undefined,
        background: checked ? fill : 'transparent',
      }}
    >
      {checked && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: box - 4, height: box - 4 }}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
