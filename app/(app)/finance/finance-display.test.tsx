import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { MonthSwitcher } from './month-switcher';
import { FinanceTotals } from './finance-totals';
import { CategoryBreakdown } from './category-breakdown';
import { MonthChart } from './month-chart';

const plain = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

describe('MonthSwitcher', () => {
  test('shows the label and calls prev/next; disabled at the range edges', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<MonthSwitcher label="September 2026" onPrev={onPrev} onNext={onNext} nextDisabled />);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onPrev).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });
});

describe('FinanceTotals', () => {
  test('shows earned, spent and signed net; marks a negative net', () => {
    render(<FinanceTotals totals={{ earned: 100000, spent: 150000, net: -50000 }} />);
    expect(plain(screen.getByTestId('fin-earned').textContent)).toBe('1 000 DA');
    expect(plain(screen.getByTestId('fin-spent').textContent)).toBe('1 500 DA');
    const net = screen.getByTestId('fin-net');
    expect(plain(net.textContent)).toBe('−500 DA');
    expect(net).toHaveAttribute('data-negative');
  });
});

describe('CategoryBreakdown', () => {
  test('renders a row per category, or the empty message', () => {
    const { rerender } = render(
      <CategoryBreakdown rows={[{ name: 'Groceries', amount: 9000, percent: 69, width: 100, color: 'var(--moss-500)' }]} />
    );
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('69%')).toBeInTheDocument();
    expect(plain(screen.getByText(/90/).textContent)).toBe('90 DA');
    rerender(<CategoryBreakdown rows={[]} />);
    expect(screen.getByText('No spending logged.')).toBeInTheDocument();
  });
});

describe('MonthChart', () => {
  const months = [
    { month: '2026-08', label: 'Aug', earned: 0, spent: 5000 },
    { month: '2026-09', label: 'Sep', earned: 10000, spent: 2500 },
  ];

  test('one button per month; the selected one is marked and clicking selects', () => {
    const onSelect = vi.fn();
    render(<MonthChart months={months} selected="2026-09" onSelect={onSelect} />);
    const sep = screen.getByRole('button', { name: /^Sep/ });
    expect(sep).toHaveAttribute('data-selected');
    expect(screen.getByRole('button', { name: /^Aug/ })).not.toHaveAttribute('data-selected');
    fireEvent.click(screen.getByRole('button', { name: /^Aug/ }));
    expect(onSelect).toHaveBeenCalledWith('2026-08');
  });

  test('bars scale to the largest value (132px), with a 2px minimum', () => {
    render(<MonthChart months={months} selected="2026-09" onSelect={vi.fn()} />);
    const bars = screen.getByRole('button', { name: /^Sep/ }).querySelectorAll('.pw-fin-chart-bars > span');
    expect(bars[0]).toHaveStyle({ height: '132px' });
    expect(bars[1]).toHaveStyle({ height: '33px' });
    const augBars = screen.getByRole('button', { name: /^Aug/ }).querySelectorAll('.pw-fin-chart-bars > span');
    expect(augBars[0]).toHaveStyle({ height: '2px' });
  });
});
