import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { verifySession } from '@/app/lib/dal';
import { AppShell } from '@/app/components/shell/app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  await verifySession();

  const store = await cookies();
  const theme = store.get('daybook_theme')?.value === 'light' ? 'light' : 'dark';
  const sidebarOpen = store.get('daybook_sidebar')?.value !== 'false';

  return (
    <AppShell initialTheme={theme} initialSidebarOpen={sidebarOpen}>
      {children}
    </AppShell>
  );
}
