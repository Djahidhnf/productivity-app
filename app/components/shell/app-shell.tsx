'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from './bottom-nav';
import { NAV_ITEMS } from './nav-items';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const activeKey = NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.key ?? 'dashboard';

  return (
    <div className="pw-shell">
      <main className="pw-main" style={{ padding: 'var(--pw-top) 0 var(--pw-bottom)' }}>
        {children}
      </main>
      <BottomNav items={NAV_ITEMS} activeKey={activeKey} />
    </div>
  );
}
