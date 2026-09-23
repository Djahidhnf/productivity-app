import { localDateKey } from './date-format';

function localDate(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function addDays(key: string, n: number): string {
  const d = localDate(key);
  d.setDate(d.getDate() + n);
  return localDateKey(d);
}

export function addMonths(key: string, n: number): string {
  const d = localDate(key);
  return localDateKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function addYears(key: string, n: number): string {
  const d = localDate(key);
  return localDateKey(new Date(d.getFullYear() + n, d.getMonth(), 1));
}

export function startOfWeekSunday(key: string): string {
  const d = localDate(key);
  return addDays(key, -d.getDay());
}

export function weekDates(startKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
}

export interface MonthGridCell {
  dateKey: string;
  inMonth: boolean;
}

export function buildMonthGrid(year: number, month: number): MonthGridCell[] {
  const first = new Date(year, month, 1);
  const shift = first.getDay();
  const gridStart = new Date(year, month, 1 - shift);
  const cells: MonthGridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({ dateKey: localDateKey(d), inMonth: d.getMonth() === month });
  }
  return cells;
}

export function calendarDateLabel(key: string, todayKey: string): string {
  if (key === todayKey) return 'Today';
  if (key === addDays(todayKey, -1)) return 'Yesterday';
  if (key === addDays(todayKey, 1)) return 'Tomorrow';
  return localDate(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function shortDateLabel(key: string): string {
  return localDate(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function monthYearLabel(key: string): string {
  return localDate(key).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
