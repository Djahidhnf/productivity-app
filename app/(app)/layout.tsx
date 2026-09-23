import type { ReactNode } from 'react';
import { verifySession } from '@/app/lib/dal';
import { AppShell } from '@/app/components/shell/app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  await verifySession();

  return <AppShell>{children}</AppShell>;
}
