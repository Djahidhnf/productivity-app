import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { AppShell } from '@/app/components/shell/app-shell';
import { NAV_ITEMS } from '@/app/components/shell/nav-items';
import { ThemeToggle } from '@/app/components/shell/theme-toggle';

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
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>dashboard content</p>
      </AppShell>
    );
    expect(container.querySelector('main')).toContainElement(screen.getByText('dashboard content'));
  });

  test('renders both the desktop sidebar and the phone bottom nav (CSS picks one)', () => {
    const { container } = render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>content</p>
      </AppShell>
    );
    expect(container.querySelector('aside.pw-sidebar')).not.toBeNull();
    expect(container.querySelector('nav.pw-bottomnav')).not.toBeNull();
    for (const item of NAV_ITEMS) {
      const links = screen.getAllByRole('link', { name: new RegExp(item.label) });
      expect(links).toHaveLength(2);
      for (const link of links) expect(link).toHaveAttribute('href', item.href);
    }
  });

  test('flips the root theme attribute when the sidebar theme button is clicked', async () => {
    render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>content</p>
      </AppShell>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  test('marks the Tasks nav item active based on the current pathname', () => {
    render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>content</p>
      </AppShell>
    );
    const tasksLinks = screen.getAllByRole('link', { name: /Tasks/ });
    expect(tasksLinks.every((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
  });
});

describe('ThemeToggle', () => {
  test('inside AppShell it flips the theme, like the sidebar switch', async () => {
    const { container } = render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <ThemeToggle className="in-page" />
      </AppShell>
    );
    const pageToggle = container.querySelector('main .in-page') as HTMLElement;
    await userEvent.click(pageToggle);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  test('outside AppShell it renders nothing', () => {
    const { container } = render(<ThemeToggle />);
    expect(container).toBeEmptyDOMElement();
  });
});
