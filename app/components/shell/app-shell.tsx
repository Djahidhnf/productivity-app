'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { NAV_ITEMS } from './nav-items';

export interface AppShellProps {
  initialTheme: 'dark' | 'light';
  initialSidebarOpen: boolean;
  children: ReactNode;
}

// The sidebar is desktop-only and the bottom nav phone-only; which one shows
// is decided purely in CSS (layout.css, 860px breakpoint) so there is no
// hydration flash.
export function AppShell({ initialTheme, initialSidebarOpen, children }: AppShellProps) {
  const [theme, setTheme] = useState(initialTheme);
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const pathname = usePathname();

  useEffect(() => {
    document.cookie = `daybook_theme=${theme}; path=/; max-age=31536000`;
    // The root <html> element's data-theme (set server-side from the cookie
    // in app/layout.tsx, so /login also renders correctly) needs live
    // updates too, otherwise color-scheme and any UI outside this shell
    // stay on the theme from the last page load.
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.cookie = `daybook_sidebar=${sidebarOpen}; path=/; max-age=31536000`;
  }, [sidebarOpen]);

  const activeKey = NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.key ?? 'dashboard';

  return (
    <div className="pw-shell">
      <Sidebar
        items={NAV_ITEMS}
        activeKey={activeKey}
        open={sidebarOpen}
        onToggleOpen={() => setSidebarOpen((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <main className="pw-main" style={{ padding: 'var(--pw-top) 0 var(--pw-bottom)' }}>
        {children}
      </main>
      <BottomNav items={NAV_ITEMS} activeKey={activeKey} />
    </div>
  );
}
