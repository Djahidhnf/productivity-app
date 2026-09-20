export function StubPage({ title }: { title: string }) {
  return (
    <div style={{ maxWidth: 1440, padding: '0 clamp(16px, 3vw, 32px)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>{title}</h1>
      <p style={{ color: 'var(--text-muted)' }}>Coming in a later phase.</p>
    </div>
  );
}
