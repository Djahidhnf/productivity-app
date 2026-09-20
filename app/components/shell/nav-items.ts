import type { IconName } from '@/app/components/icons';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: IconName;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Today', href: '/dashboard', icon: 'home' },
  { key: 'tasks', label: 'Tasks', href: '/tasks', icon: 'check-square' },
  { key: 'calendar', label: 'Calendar', href: '/calendar', icon: 'calendar' },
  { key: 'matrix', label: 'Matrix', href: '/matrix', icon: 'grid' },
  { key: 'habits', label: 'Habits', href: '/habits', icon: 'flame' },
  { key: 'journal', label: 'Journal', href: '/journal', icon: 'book' },
];
