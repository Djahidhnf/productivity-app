// Vivid priority hues: red (do first), yellow (schedule), blue (delegate),
// green (eliminate). The AMBER enum value is displayed as yellow.
export const PRIORITY_COLORS = {
  RED: 'var(--prio-red)',
  AMBER: 'var(--prio-yellow)',
  BLUE: 'var(--prio-blue)',
  GREEN: 'var(--prio-green)',
} as const;

/** Text color to use on a solid PRIORITY_COLORS fill. Yellow is too light for white. */
export const PRIORITY_ON_COLORS = {
  RED: 'var(--prio-on-dark)',
  AMBER: 'var(--prio-on-light)',
  BLUE: 'var(--prio-on-dark)',
  GREEN: 'var(--prio-on-dark)',
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
