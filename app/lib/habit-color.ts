// Habits store the hex they were assigned at creation (the palette in
// habits/actions.ts, from the original lime design). Render them as the
// matching desaturated Still hue so saved habits follow the current design
// without a data migration; anything unrecognised is shown as stored.
const STILL_HUES: Record<string, string> = {
  '#c6ff34': 'var(--sage-500)',
  '#60a5fa': 'var(--mist-500)',
  '#4ade80': 'var(--moss-500)',
  '#fbbf24': 'var(--amber-500)',
  '#f87171': 'var(--clay-500)',
  '#d9ff70': 'var(--sage-400)',
};

export function habitColor(stored: string): string {
  return STILL_HUES[stored.toLowerCase()] ?? stored;
}
