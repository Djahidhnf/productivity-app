import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** The page title; pass a node when it has to be interactive (e.g. a picker button). */
  title: ReactNode;
  /** Mono text after the title, e.g. "12 open". */
  meta?: string;
  /** Small mono line above the title, e.g. the long date. */
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, meta, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={className ? `pw-pagehead ${className}` : 'pw-pagehead'}>
      <div className="pw-pagehead-titles">
        {eyebrow && <span className="st-eyebrow">{eyebrow}</span>}
        <h1 className="st-title">
          {title}
          {meta && <span className="st-title-meta">{meta}</span>}
        </h1>
      </div>
      {actions && <div className="pw-pagehead-actions">{actions}</div>}
    </header>
  );
}
