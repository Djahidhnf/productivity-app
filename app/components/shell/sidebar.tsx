'use client';

import Link from 'next/link';
import { Icon } from '@/app/components/icons';
import { IconButton } from '@/app/components/ui/icon-button';
import type { NavItem } from './nav-items';

export interface SidebarProps {
  items: readonly NavItem[];
  activeKey: string;
  open: boolean;
  onToggleOpen: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function Sidebar({ items, activeKey, open, onToggleOpen, theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="pw-sidebar" data-open={open}>
      <div className="pw-sidebar-head">
        {open && <span className="pw-wordmark">daybook</span>}
        <IconButton label="Toggle sidebar" size="sm" onClick={onToggleOpen}>
          <Icon name={open ? 'panel-close' : 'panel-open'} size={16} />
        </IconButton>
      </div>
      <nav className="pw-nav">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            title={item.label}
            className="pw-nav-link"
            aria-current={item.key === activeKey ? 'page' : undefined}
          >
            <Icon name={item.icon} size={16} />
            {open && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
      <div className="pw-sidebar-foot">
        {open && <span className="pw-sidebar-note">Synced to your account</span>}
        <IconButton label="Toggle theme" size="sm" onClick={onToggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </IconButton>
      </div>
    </aside>
  );
}
