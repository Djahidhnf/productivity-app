/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll, vi } from 'vitest';

const cookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { revalidatePath } from 'next/cache';
import { createFinanceEntry, deleteFinanceEntry, type CreateFinanceEntryInput } from './actions';

const valid: CreateFinanceEntryInput = { type: 'EXPENSE', amount: 125050, category: 'Groceries', note: '  Weekly shop ', date: '2091-04-10' };

describe('finance actions', () => {
  const created: string[] = [];

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.financeEntry.deleteMany({ where: { id: { in: created.splice(0) } } });
    vi.mocked(revalidatePath).mockClear();
  });

  test('createFinanceEntry stores the entry with a trimmed note and revalidates /finance', async () => {
    const entry = await createFinanceEntry(valid);
    created.push(entry.id);
    expect(entry).toEqual({ id: entry.id, type: 'EXPENSE', amount: 125050, category: 'Groceries', note: 'Weekly shop', date: '2091-04-10' });
    expect(await prisma.financeEntry.findUnique({ where: { id: entry.id } })).not.toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/finance');
  });

  test('createFinanceEntry accepts an income category for income', async () => {
    const entry = await createFinanceEntry({ ...valid, type: 'INCOME', category: 'Salary' });
    created.push(entry.id);
    expect(entry.type).toBe('INCOME');
  });

  test.each([
    ['a zero amount', { amount: 0 }, 'Invalid amount'],
    ['a fractional amount', { amount: 10.5 }, 'Invalid amount'],
    ['an amount over the max', { amount: 2147483648 }, 'Invalid amount'],
    ['a category from the other type', { category: 'Salary' }, 'Invalid category'],
    ['an unknown type', { type: 'GIFT' as never }, 'Invalid entry type'],
    ['a malformed date', { date: '10/04/2091' }, 'Invalid date'],
    ['an impossible date', { date: '2091-02-30' }, 'Invalid date'],
  ])('createFinanceEntry rejects %s', async (_label, patch, message) => {
    await expect(createFinanceEntry({ ...valid, ...patch })).rejects.toThrow(message);
  });

  test('deleteFinanceEntry removes the row', async () => {
    const entry = await createFinanceEntry(valid);
    await deleteFinanceEntry(entry.id);
    expect(await prisma.financeEntry.findUnique({ where: { id: entry.id } })).toBeNull();
  });
});
