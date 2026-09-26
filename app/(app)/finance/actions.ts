'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import { categoriesFor, MAX_AMOUNT, type EntryKind } from '@/app/lib/finance';
import { serializeFinanceEntry, type FinanceEntryDTO } from '@/app/lib/finance-dto';

export interface CreateFinanceEntryInput {
  type: EntryKind;
  /** Centimes. */
  amount: number;
  category: string;
  note: string;
  /** 'YYYY-MM-DD' */
  date: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(key: string): boolean {
  if (!DATE_RE.test(key)) return false;
  const date = new Date(key);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
}

export async function createFinanceEntry(input: CreateFinanceEntryInput): Promise<FinanceEntryDTO> {
  await verifySession();
  if (input.type !== 'EXPENSE' && input.type !== 'INCOME') throw new Error('Invalid entry type');
  if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > MAX_AMOUNT) throw new Error('Invalid amount');
  if (!categoriesFor(input.type).includes(input.category)) throw new Error('Invalid category');
  if (!isRealDate(input.date)) throw new Error('Invalid date');
  const entry = await prisma.financeEntry.create({
    data: {
      type: input.type,
      amount: input.amount,
      category: input.category,
      note: input.note.trim(),
      date: new Date(input.date),
    },
  });
  revalidatePath('/finance');
  return serializeFinanceEntry(entry);
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  await verifySession();
  await prisma.financeEntry.delete({ where: { id } });
  revalidatePath('/finance');
}
