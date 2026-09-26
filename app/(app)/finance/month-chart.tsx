'use client';

import { formatMoney } from '@/app/lib/finance';
import type { ChartMonth } from './finance-views';

const BAR_MAX = 132;

export interface MonthChartProps {
  months: ChartMonth[];
  selected: string;
  onSelect: (month: string) => void;
}

export function MonthChart({ months, selected, onSelect }: MonthChartProps) {
  const largest = Math.max(1, ...months.flatMap((m) => [m.earned, m.spent]));
  const height = (value: number) => Math.max(2, Math.round((value / largest) * BAR_MAX));

  return (
    <section className="pw-fin-section">
      <div className="pw-fin-chart-head">
        <h2 className="st-label">Last 6 months</h2>
        <div className="pw-fin-legend">
          <span><i style={{ background: 'var(--accent)' }} />Earned</span>
          <span><i style={{ background: 'var(--border-strong)' }} />Spent</span>
        </div>
      </div>
      <div className="pw-fin-chart">
        {months.map((m) => {
          const title = `${m.label} — earned ${formatMoney(m.earned)}, spent ${formatMoney(m.spent)}`;
          return (
            <button
              key={m.month}
              type="button"
              className="pw-fin-chart-col"
              data-selected={m.month === selected || undefined}
              title={title}
              aria-label={title}
              onClick={() => onSelect(m.month)}
            >
              <span className="pw-fin-chart-bars">
                <span style={{ height: height(m.earned), background: 'var(--accent)' }} />
                <span style={{ height: height(m.spent), background: 'var(--border-strong)' }} />
              </span>
              <span className="pw-fin-chart-label">{m.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
