import { MIN_MONTH_INDEX, MAX_MONTH_INDEX, monthIndexOfDateKey, firstOfMonthKey } from './calendar-units';

/** Same values as Prisma's EntryType; declared here so client code needn't import @prisma/client. */
export type EntryKind = 'EXPENSE' | 'INCOME';

export const EXPENSE_CATEGORIES: readonly string[] = ['Housing', 'Groceries', 'Dining', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun', 'Other'];
export const INCOME_CATEGORIES: readonly string[] = ['Salary', 'Freelance', 'Gifts', 'Refund', 'Other'];

export function categoriesFor(type: EntryKind): readonly string[] {
  return type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function defaultCategory(type: EntryKind): string {
  return type === 'INCOME' ? 'Salary' : 'Groceries';
}

const CATEGORY_COLOR: Record<string, string> = {
  Housing: 'var(--gray-500)',
  Groceries: 'var(--moss-500)',
  Dining: 'var(--amber-500)',
  Transport: 'var(--mist-500)',
  Bills: 'var(--sage-500)',
  Shopping: 'var(--clay-500)',
  Health: 'var(--moss-700)',
  Fun: 'var(--amber-700)',
  Other: 'var(--gray-400)',
  Salary: 'var(--sage-500)',
  Freelance: 'var(--mist-500)',
  Gifts: 'var(--amber-500)',
  Refund: 'var(--moss-500)',
};

export function categoryColor(name: string): string {
  return CATEGORY_COLOR[name] ?? 'var(--gray-400)';
}

/** Largest amount a Postgres INTEGER column holds, in centimes (21 474 836,47 DA). */
export const MAX_AMOUNT = 2147483647;

const MONEY = new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Centimes → "1 234,5 DA". Negatives get "−"; `signed` also puts "+" on positives. */
export function formatMoney(centimes: number, opts: { signed?: boolean } = {}): string {
  const text = MONEY.format(Math.abs(centimes) / 100);
  if (centimes < 0) return `−${text}`;
  if (opts.signed && centimes > 0) return `+${text}`;
  return text;
}

const AMOUNT_RE = /^\d+([.,]\d{1,2})?$/;

/** "12", "12.5", "12,50" → centimes; null if not a positive amount with at most 2 decimals. */
export function parseAmount(input: string): number | null {
  const trimmed = input.trim();
  if (!AMOUNT_RE.test(trimmed)) return null;
  const centimes = Math.round(Number(trimmed.replace(',', '.')) * 100);
  if (centimes <= 0 || centimes > MAX_AMOUNT) return null;
  return centimes;
}

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_RE = /^(\d{4})-(\d{2})$/;

/** A 'YYYY-MM' month key as year * 12 + zero-based month. */
export function monthIndexOfMonthKey(month: string): number {
  return monthIndexOfDateKey(`${month}-01`);
}

function monthKeyOfIndex(index: number): string {
  return firstOfMonthKey(index).slice(0, 7);
}

export function addMonthKey(month: string, n: number): string {
  return monthKeyOfIndex(monthIndexOfMonthKey(month) + n);
}

/** Validates a ?month=YYYY-MM value, clamped to 1900-01..2100-12. */
export function parseMonthParam(value: string | undefined, fallback: string): string {
  const match = value ? MONTH_RE.exec(value) : null;
  if (!match) return fallback;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return fallback;
  const index = Number(match[1]) * 12 + month - 1;
  return monthKeyOfIndex(Math.min(MAX_MONTH_INDEX, Math.max(MIN_MONTH_INDEX, index)));
}

export function monthKeyLabel(month: string): string {
  return `${MONTHS_LONG[Number(month.slice(5, 7)) - 1]} ${Number(month.slice(0, 4))}`;
}

export function monthShortLabel(month: string): string {
  return MONTHS_SHORT[Number(month.slice(5, 7)) - 1];
}
