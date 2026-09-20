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
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '6px 4px calc(6px + env(safe-area-inset-bottom))', zIndex: 20 }}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 2px', fontSize: 10, flex: 1, color: active ? 'var(--accent)' : 'var(--text-muted)', textDecoration: 'none' }}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
