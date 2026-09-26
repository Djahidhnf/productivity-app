import { formatMoney } from '@/app/lib/finance';
import type { CategoryRow } from './finance-views';

export function CategoryBreakdown({ rows }: { rows: CategoryRow[] }) {
  return (
    <section className="pw-fin-section">
      <h2 className="st-label">Spending by category</h2>
      {rows.length === 0 ? (
        <p className="st-empty">No spending logged.</p>
      ) : (
        rows.map((row) => (
          <div key={row.name} className="pw-fin-cat">
            <div className="pw-fin-cat-head">
              <span className="pw-fin-dot" style={{ background: row.color }} />
              <span style={{ flex: 1 }}>{row.name}</span>
              <span className="pw-fin-cat-pct">{row.percent}%</span>
              <span className="pw-fin-cat-amt">{formatMoney(row.amount)}</span>
            </div>
            <div className="pw-fin-bar">
              <div style={{ width: `${row.width}%`, background: row.color }} />
            </div>
          </div>
        ))
      )}
    </section>
  );
}
