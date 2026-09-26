import type { IconName } from '@/app/components/icons';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: IconName;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Today', href: '/dashboard', icon: 'sun' },
  { key: 'tasks', label: 'Tasks', href: '/tasks', icon: 'list-checks' },
  { key: 'calendar', label: 'Calendar', href: '/calendar', icon: 'calendar' },
  { key: 'matrix', label: 'Matrix', href: '/matrix', icon: 'grid-2x2' },
  { key: 'habits', label: 'Habits', href: '/habits', icon: 'repeat' },
  { key: 'notes', label: 'Notes', href: '/notes', icon: 'sticky-note' },
];
