import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { BottomNav } from '@/app/components/shell/bottom-nav';
import { NAV_ITEMS } from '@/app/components/shell/nav-items';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('BottomNav', () => {
  test('renders a link for every nav item, highlighting the active one', () => {
    render(<BottomNav items={NAV_ITEMS} activeKey="habits" />);
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toHaveAttribute('href', item.href);
    }
    expect(screen.getByRole('link', { name: /Habits/ }).style.color).toBe('var(--accent)');
    expect(screen.getByRole('link', { name: /Tasks/ }).style.color).toBe('var(--text-muted)');
  });
});
