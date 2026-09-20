'use client';

export interface CheckToggleProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  accentColor?: string;
}

export function CheckToggle({ checked, onToggle, label, accentColor }: CheckToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{
        width: 20,
        height: 20,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-xs)',
        border: checked ? 'none' : '1.5px solid var(--border-strong)',
        background: checked ? (accentColor ?? 'var(--accent)') : 'transparent',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {checked && (
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
