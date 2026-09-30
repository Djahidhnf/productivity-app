import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { currentAccountEmail } from '@/app/lib/dal';
import { AppShell } from '@/app/components/shell/app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const accountEmail = await currentAccountEmail();

  const store = await cookies();
  const theme = store.get('daybook_theme')?.value === 'light' ? 'light' : 'dark';
  const sidebarOpen = store.get('daybook_sidebar')?.value !== 'false';

  return (
    <AppShell initialTheme={theme} initialSidebarOpen={sidebarOpen} accountEmail={accountEmail}>
      {children}
    </AppShell>
  );
}
