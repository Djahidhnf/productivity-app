'use client';

import { Icon } from '@/app/components/icons';
import { IconButton } from '@/app/components/ui/icon-button';
import { formatMoney, categoryColor } from '@/app/lib/finance';
import type { DayGroup } from './finance-views';

export interface EntryListProps {
  groups: DayGroup[];
  count: number;
  onDelete: (id: string) => void;
}

export function EntryList({ groups, count, onDelete }: EntryListProps) {
  return (
    <section className="pw-fin-section" style={{ gap: 4 }}>
      <h2 className="st-label">
        Entries<span className="st-label-count">{count}</span>
      </h2>
      {groups.length === 0 ? (
        <p className="st-empty">Nothing logged this month.</p>
      ) : (
        groups.map((group) => (
          <div key={group.date}>
            <div className="pw-fin-dayhead">
              <span>{group.label}</span>
              <span className="pw-fin-mono" data-testid={`day-total-${group.date}`}>
                {formatMoney(group.total, { signed: true })}
              </span>
            </div>
            {group.entries.map((entry) => {
              const income = entry.type === 'INCOME';
              return (
                <div key={entry.id} className="pw-fin-row">
                  <span className="pw-fin-dot" style={{ background: categoryColor(entry.category) }} />
                  <span className="pw-fin-row-text">
                    {entry.category}
                    {entry.note && <span className="pw-fin-row-note">{entry.note}</span>}
                  </span>
                  <span className="pw-fin-row-amt" data-testid={`amount-${entry.id}`} data-income={income || undefined}>
                    {formatMoney(income ? entry.amount : -entry.amount, { signed: true })}
                  </span>
                  <IconButton label={`Remove ${entry.category} entry`} size="sm" onClick={() => onDelete(entry.id)}>
                    <Icon name="x" size={15} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        ))
      )}
    </section>
  );
}
