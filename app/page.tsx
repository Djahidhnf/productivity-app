import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/dal';

export default async function RootPage() {
  const session = await getSession();
  redirect(session ? '/dashboard' : '/login');
}
