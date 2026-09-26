'use client';

import { useEffect, type ReactNode } from 'react';
import { Icon } from '@/app/components/icons';
import { IconButton } from './icon-button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Small muted line under the title, e.g. "Edited 3h ago". */
  description?: string;
  /** Max panel width in px. */
  width?: number;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, description, width = 460, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--overlay)',
        backdropFilter: 'blur(var(--blur-overlay))',
        WebkitBackdropFilter: 'blur(var(--blur-overlay))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '90dvh',
          overflowY: 'auto',
          background: 'var(--surface-1)',
          color: 'var(--fg-1)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-overlay)',
          padding: '20px 20px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{title}</h3>
            {description && <p className="st-eyebrow" style={{ margin: 0 }}>{description}</p>}
          </div>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <Icon name="x" size={16} />
          </IconButton>
        </div>
        <div style={{ paddingRight: 4 }}>{children}</div>
      </div>
    </div>
  );
}
