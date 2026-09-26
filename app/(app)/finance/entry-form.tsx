'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/app/components/icons';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { IconButton } from '@/app/components/ui/icon-button';
import { PillToggle } from '@/app/components/ui/pill-toggle';
import { categoriesFor, defaultCategory, parseAmount, type EntryKind } from '@/app/lib/finance';
import type { CreateFinanceEntryInput } from './actions';

const TYPE_OPTIONS = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
] as const;

export interface EntryFormProps {
  defaultDate: string;
  /** Resolves true when the entry was saved; amount and note clear only then. */
  onSubmit: (input: CreateFinanceEntryInput) => Promise<boolean>;
}

export function EntryForm({ defaultDate, onSubmit }: EntryFormProps) {
  const [type, setType] = useState<EntryKind>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(defaultCategory('EXPENSE'));
  const [note, setNote] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  function changeType(next: EntryKind) {
    setType(next);
    setCategory(defaultCategory(next));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const centimes = parseAmount(amount);
    if (centimes === null || !date) {
      amountRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const ok = await onSubmit({ type, amount: centimes, category, note: note.trim(), date });
      if (ok) {
        setAmount('');
        setNote('');
      }
    } catch {
      // Treat rejection as failed submit (ok = false); keep fields
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="pw-fin-form" onSubmit={handleSubmit} aria-label="New entry">
      <div style={{ alignSelf: 'flex-start' }}>
        <PillToggle ariaLabel="Entry type" options={TYPE_OPTIONS} value={type} onChange={changeType} />
      </div>
      <div className="pw-fin-entry">
        <Input
          ref={amountRef}
          aria-label="Amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Select
          aria-label="Category"
          options={categoriesFor(type).map((c) => ({ value: c, label: c }))}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <div className="pw-fin-entry-note">
          <Input aria-label="Note" placeholder="What for?" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Input aria-label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <IconButton type="submit" label="Log entry" variant="primary" disabled={busy}>
          <Icon name="plus" size={16} />
        </IconButton>
      </div>
    </form>
  );
}
