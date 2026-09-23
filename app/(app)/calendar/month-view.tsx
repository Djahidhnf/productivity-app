'use client';

import { PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import type { MonthCellData } from './calendar-views';
import type { TaskDTO } from './queries';

export interface MonthViewProps {
  cells: MonthCellData[];
  onCellClick: (dateKey: string) => void;
  onTaskOpen: (task: TaskDTO) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onCellDrop: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ cells, onCellClick, onTaskOpen, onTaskDragStart, onCellDrop }: MonthViewProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: 1,
        padding: '0 clamp(16px, 3vw, 32px) 24px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
      }}
    >
      {WEEKDAY_LABELS.map((w) => (
        <div key={w} style={{ textAlign: 'center', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', padding: '4px 0' }}>
          {w}
        </div>
      ))}
      {cells.map((cell) => (
        <div
          key={cell.dateKey}
          data-datekey={cell.dateKey}
          onClick={() => onCellClick(cell.dateKey)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            onCellDrop(cell.dateKey);
          }}
          style={{
            minHeight: 84,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            opacity: cell.inMonth ? 1 : 0.45,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>{Number(cell.dateKey.slice(-2))}</span>
          {cell.chips.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                onTaskDragStart(task);
              }}
              onClick={(event) => {
                event.stopPropagation();
                onTaskOpen(task);
              }}
              style={{
                fontSize: '10px',
                padding: '1px 4px',
                borderRadius: 'var(--radius-xs)',
                background: task.priority ? PRIORITY_COLORS[task.priority] : 'var(--surface-3)',
                color: task.priority ? 'var(--on-accent)' : 'var(--text-secondary)',
                textDecoration: task.done ? 'line-through' : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
              }}
            >
              {task.text}
            </div>
          ))}
          {cell.moreCount > 0 && (
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              +{cell.moreCount} more
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
