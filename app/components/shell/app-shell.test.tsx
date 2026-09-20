import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { AppShell } from '@/app/components/shell/app-shell';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/tasks',
}));

describe('AppShell', () => {
  test('applies the initial theme to the root element', () => {
    const { container } = render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>content</p>
      </AppShell>
    );
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'dark');
  });

  test('renders children inside <main>', () => {
    render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>dashboard content</p>
      </AppShell>
    );
    expect(screen.getByText('dashboard content')).toBeInTheDocument();
  });

  test('flips the theme attribute when the sidebar theme button is clicked', async () => {
    const { container } = render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>content</p>
      </AppShell>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'light');
  });

  test('marks the Tasks nav item active based on the current pathname', () => {
    render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>content</p>
      </AppShell>
    );
    const tasksLinks = screen.getAllByRole('link', { name: /Tasks/ });
    expect(tasksLinks.some((link) => link.style.color === 'var(--accent)')).toBe(true);
  });
});
