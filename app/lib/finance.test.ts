import { describe, test, expect } from 'vitest';
import {
  categoriesFor,
  defaultCategory,
  categoryColor,
  formatMoney,
  parseAmount,
  addMonthKey,
  parseMonthParam,
  monthKeyLabel,
  monthShortLabel,
  monthIndexOfMonthKey,
  MAX_AMOUNT,
} from './finance';

// fr-DZ groups thousands with a narrow no-break space (U+202F); normalize for readable assertions.
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('categories', () => {
  test('expense and income lists with their defaults', () => {
    expect(categoriesFor('EXPENSE')).toEqual(['Housing', 'Groceries', 'Dining', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun', 'Other']);
    expect(categoriesFor('INCOME')).toEqual(['Salary', 'Freelance', 'Gifts', 'Refund', 'Other']);
    expect(defaultCategory('EXPENSE')).toBe('Groceries');
    expect(defaultCategory('INCOME')).toBe('Salary');
  });

  test('colors come from the Still hues with a gray fallback', () => {
    expect(categoryColor('Groceries')).toBe('var(--moss-500)');
    expect(categoryColor('Salary')).toBe('var(--sage-500)');
    expect(categoryColor('Unknown')).toBe('var(--gray-400)');
  });
});

describe('formatMoney', () => {
  test('formats centimes as dinars', () => {
    expect(plain(formatMoney(0))).toBe('0 DA');
    expect(plain(formatMoney(123450))).toBe('1 234,5 DA');
    expect(plain(formatMoney(42000000))).toBe('420 000 DA');
    expect(plain(formatMoney(7))).toBe('0,07 DA');
  });

  test('negative values get a minus; signed adds a plus to positives', () => {
    expect(plain(formatMoney(-5000))).toBe('−50 DA');
    expect(plain(formatMoney(5000, { signed: true }))).toBe('+50 DA');
    expect(plain(formatMoney(-5000, { signed: true }))).toBe('−50 DA');
    expect(plain(formatMoney(0, { signed: true }))).toBe('0 DA');
  });
});

describe('parseAmount', () => {
  test('accepts dot or comma decimals and returns centimes', () => {
    expect(parseAmount('12')).toBe(1200);
    expect(parseAmount('12.5')).toBe(1250);
    expect(parseAmount(' 12,50 ')).toBe(1250);
    expect(parseAmount('0.07')).toBe(7);
  });

  test('rejects blank, non-numbers, zero, negatives, 3+ decimals and overflow', () => {
    for (const bad of ['', 'abc', '0', '0.00', '-5', '1.234', '1e3', '12.']) {
      expect(parseAmount(bad)).toBeNull();
    }
    expect(parseAmount(String(MAX_AMOUNT / 100 + 1))).toBeNull();
  });
});

describe('month keys', () => {
  test('addMonthKey crosses year boundaries', () => {
    expect(addMonthKey('2026-09', 1)).toBe('2026-10');
    expect(addMonthKey('2026-12', 1)).toBe('2027-01');
    expect(addMonthKey('2026-01', -1)).toBe('2025-12');
    expect(addMonthKey('2026-09', -5)).toBe('2026-04');
  });

  test('parseMonthParam validates and clamps, falling back when invalid', () => {
    expect(parseMonthParam('2026-03', '2026-09')).toBe('2026-03');
    expect(parseMonthParam(undefined, '2026-09')).toBe('2026-09');
    expect(parseMonthParam('2026-13', '2026-09')).toBe('2026-09');
    expect(parseMonthParam('garbage', '2026-09')).toBe('2026-09');
    expect(parseMonthParam('1800-05', '2026-09')).toBe('1900-01');
    expect(parseMonthParam('2200-05', '2026-09')).toBe('2100-12');
  });

  test('labels and index', () => {
    expect(monthKeyLabel('2026-09')).toBe('September 2026');
    expect(monthShortLabel('2026-09')).toBe('Sep');
    expect(monthIndexOfMonthKey('2026-01')).toBe(2026 * 12);
  });
});
