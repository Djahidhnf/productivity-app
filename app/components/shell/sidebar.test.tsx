import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Sidebar } from '@/app/components/shell/sidebar';
import { NAV_ITEMS } from '@/app/components/shell/nav-items';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('Sidebar', () => {
  test('renders a link for every nav item, highlighting the active one', () => {
    render(
      <Sidebar items={NAV_ITEMS} activeKey="tasks" open theme="dark" onToggleOpen={vi.fn()} onToggleTheme={vi.fn()} />
    );
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.href);
    }
    expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
  });

  test('hides labels and the app name when collapsed', () => {
    render(
      <Sidebar items={NAV_ITEMS} activeKey="tasks" open={false} theme="dark" onToggleOpen={vi.fn()} onToggleTheme={vi.fn()} />
    );
    expect(screen.queryByText('daybook')).not.toBeInTheDocument();
    expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(NAV_ITEMS.length);
  });

  test('calls onToggleOpen when the collapse button is clicked', async () => {
    const onToggleOpen = vi.fn();
    render(
      <Sidebar items={NAV_ITEMS} activeKey="tasks" open theme="dark" onToggleOpen={onToggleOpen} onToggleTheme={vi.fn()} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(onToggleOpen).toHaveBeenCalledOnce();
  });

  test('calls onToggleTheme when the theme button is clicked', async () => {
    const onToggleTheme = vi.fn();
    render(
      <Sidebar items={NAV_ITEMS} activeKey="tasks" open theme="dark" onToggleOpen={vi.fn()} onToggleTheme={onToggleTheme} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});
