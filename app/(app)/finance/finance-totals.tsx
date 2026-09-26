import { formatMoney } from '@/app/lib/finance';
import type { MonthTotals } from './finance-views';

export function FinanceTotals({ totals }: { totals: MonthTotals }) {
  return (
    <div className="pw-fin-totals">
      <div className="pw-stat">
        <span className="st-label">Earned</span>
        <span className="pw-fin-total" data-testid="fin-earned">{formatMoney(totals.earned)}</span>
      </div>
      <div className="pw-stat">
        <span className="st-label">Spent</span>
        <span className="pw-fin-total" data-testid="fin-spent">{formatMoney(totals.spent)}</span>
      </div>
      <div className="pw-stat">
        <span className="st-label">Net</span>
        <span className="pw-fin-total" data-testid="fin-net" data-negative={totals.net < 0 || undefined}>
          {formatMoney(totals.net, { signed: true })}
        </span>
      </div>
    </div>
  );
}
