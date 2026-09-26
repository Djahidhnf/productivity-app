'use client';

import { useActionState } from 'react';
import { Button } from '@/app/components/ui/button';
import type { LoginState } from './actions';

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--fg-2)' };

export interface LoginFormProps {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
}

export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(action, undefined);

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="email" style={labelStyle}>
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="username" className="st-input" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="password" style={labelStyle}>
          Password
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="st-input" />
      </div>
      {state?.error && (
        <p role="alert" style={{ color: 'var(--danger-fg)', fontSize: 13, margin: 0 }}>
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} style={{ height: 36, marginTop: 4 }}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
