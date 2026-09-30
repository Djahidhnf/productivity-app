import { login } from './actions';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--fg-1)',
        fontFamily: 'var(--font-sans)',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="pw-wordmark" style={{ fontSize: 'var(--text-xl)' }}>klivr</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-3)' }}>Sign in to continue.</span>
        </div>
        <LoginForm action={login} />
      </div>
    </div>
  );
}
