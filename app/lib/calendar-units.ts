export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;
export const MIN_MONTH_INDEX = MIN_YEAR * 12;
export const MAX_MONTH_INDEX = MAX_YEAR * 12 + 11;

export function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.trunc(year)));
}

export function yearOfDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}

/** A month as a single integer: year * 12 + zero-based month. */
export function monthIndexOfDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4)) * 12 + (Number(dateKey.slice(5, 7)) - 1);
}

export function monthIndexToParts(monthIndex: number): { year: number; month: number } {
  return { year: Math.floor(monthIndex / 12), month: monthIndex % 12 };
}

export function firstOfMonthKey(monthIndex: number): string {
  const { year, month } = monthIndexToParts(monthIndex);
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`;
}

export function firstOfYearKey(year: number): string {
  return `${String(year).padStart(4, '0')}-01-01`;
}
