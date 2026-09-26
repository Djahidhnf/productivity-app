import { PageHeader } from './page-header';

export function StubPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <p className="st-empty" style={{ margin: 0, padding: '0 var(--pw-gutter)' }}>Coming in a later phase.</p>
    </div>
  );
}
