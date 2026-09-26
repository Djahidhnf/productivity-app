'use client';

import Link from 'next/link';
import { Icon } from '@/app/components/icons';
import type { NavItem } from './nav-items';

export interface BottomNavProps {
  items: readonly NavItem[];
  activeKey: string;
}

export function BottomNav({ items, activeKey }: BottomNavProps) {
  return (
    <nav
      className="pw-bottomnav"
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, borderTop: '1px solid var(--border-1)', background: 'var(--surface-2)', padding: '6px calc(4px + env(safe-area-inset-right, 0px)) calc(6px + env(safe-area-inset-bottom, 0px)) calc(4px + env(safe-area-inset-left, 0px))', zIndex: 20 }}
    >
      <div className="pw-bottomnav-inner">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="pw-bottomnav-link"
            aria-current={item.key === activeKey ? 'page' : undefined}
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
