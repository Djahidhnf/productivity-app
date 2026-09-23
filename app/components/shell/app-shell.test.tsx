import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { AppShell } from '@/app/components/shell/app-shell';
import { NAV_ITEMS } from '@/app/components/shell/nav-items';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/tasks',
}));

describe('AppShell', () => {
  test('renders children inside <main>', () => {
    const { container } = render(
      <AppShell>
        <p>dashboard content</p>
      </AppShell>
    );
    expect(container.querySelector('main')).toContainElement(screen.getByText('dashboard content'));
  });

  test('has no sidebar and no theme or sidebar toggle buttons', () => {
    const { container } = render(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(container.querySelector('aside')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Toggle theme' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Toggle sidebar' })).toBeNull();
  });

  test('renders the bottom nav with exactly one link per nav item', () => {
    render(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toHaveAttribute('href', item.href);
    }
  });

  test('marks the Tasks nav item active based on the current pathname', () => {
    render(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(screen.getByRole('link', { name: /Tasks/ }).style.color).toBe('var(--accent)');
  });
});
