'use client';

import Link from 'next/link';
import { Icon } from '@/app/components/icons';
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
    <aside
      className="pw-sidebar"
      style={{
        width: open ? '220px' : '64px',
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-4) 10px',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        transition: 'width .16s var(--ease-out)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', minHeight: 28 }}>
        {open && (
          <>
            <span
              style={{
                width: 22, height: 22, flex: 'none', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: 'var(--on-accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)',
                fontWeight: 'var(--weight-bold)', fontSize: 13,
              }}
            >
              D
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', fontSize: 'var(--text-md)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              Daybook
            </span>
          </>
        )}
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-sm)', flex: 'none', margin: open ? undefined : '0 auto', display: 'flex' }}
        >
          <Icon name={open ? 'panel' : 'menu'} size={17} />
        </button>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center',
                gap: 'var(--space-3)', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-subtle)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              <Icon name={item.icon} size={18} />
              {open && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
          style={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center', gap: 'var(--space-3)', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', cursor: 'pointer' }}
        >
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={16} />
          {open && <span style={{ whiteSpace: 'nowrap' }}>{theme === 'dark' ? 'Dark' : 'Light'}</span>}
        </button>
        {open && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 var(--space-2)' }}>
            Synced to your account
          </div>
        )}
      </div>
    </aside>
  );
}
