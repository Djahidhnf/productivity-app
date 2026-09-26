// Desaturated Still status hues: clay (do first), amber (schedule),
// mist (delegate), graphite (eliminate).
export const PRIORITY_COLORS = {
  RED: 'var(--clay-500)',
  AMBER: 'var(--amber-500)',
  BLUE: 'var(--mist-500)',
  GREEN: 'var(--gray-400)',
} as const;

export type PriorityKey = keyof typeof PRIORITY_COLORS;

/** A small colored square marking a task's quadrant. */
export function PriorityFlag({ priority }: { priority: PriorityKey }) {
  return (
    <span
      role="img"
      aria-label={`Priority: ${priority.toLowerCase()}`}
      style={{ width: 7, height: 7, borderRadius: 2, background: PRIORITY_COLORS[priority], flex: 'none' }}
    />
  );
}
