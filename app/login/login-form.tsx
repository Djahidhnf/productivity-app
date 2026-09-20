'use client';

import { useActionState } from 'react';
import type { LoginState } from './actions';

const fieldStyle: React.CSSProperties = {
  height: 40,
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
};

export interface LoginFormProps {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
}

export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(action, undefined);

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="email" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="username" style={fieldStyle} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="password" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          Password
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" style={fieldStyle} />
      </div>
      {state?.error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', margin: 0 }}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          height: 40,
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--accent)',
          color: 'var(--on-accent)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 'var(--weight-medium)',
          fontSize: 'var(--text-sm)',
          cursor: pending ? 'default' : 'pointer',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
