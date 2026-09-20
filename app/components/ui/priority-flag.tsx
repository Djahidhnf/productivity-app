export const PRIORITY_COLORS = {
  RED: '#f87171',
  AMBER: '#fbbf24',
  BLUE: '#60a5fa',
  GREEN: '#4ade80',
} as const;

export type PriorityKey = keyof typeof PRIORITY_COLORS;

export function PriorityFlag({ priority }: { priority: PriorityKey }) {
  return (
    <svg
      role="img"
      aria-label={`Priority: ${priority.toLowerCase()}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke={PRIORITY_COLORS[priority]}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 14, height: 14, flex: 'none' }}
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </svg>
  );
}
