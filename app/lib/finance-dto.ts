import type { EntryKind } from './finance';
import { toDateKey } from './task-dto';

export interface FinanceEntryDTO {
  id: string;
  type: EntryKind;
  /** Centimes, always positive. */
  amount: number;
  category: string;
  note: string;
  /** 'YYYY-MM-DD' */
  date: string;
}

export function serializeFinanceEntry(entry: {
  id: string;
  type: EntryKind;
  amount: number;
  category: string;
  note: string;
  date: Date;
}): FinanceEntryDTO {
  return {
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    category: entry.category,
    note: entry.note,
    date: toDateKey(entry.date)!,
  };
}
