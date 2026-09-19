import { describe, test, expect } from 'vitest';
import { resolveProxyRedirect } from '@/app/lib/proxy-logic';

describe('resolveProxyRedirect', () => {
  test('sends anonymous visitors to /login', () => {
    expect(resolveProxyRedirect('/dashboard', false)).toBe('/login');
    expect(resolveProxyRedirect('/tasks', false)).toBe('/login');
  });

  test('lets anonymous visitors reach /login', () => {
    expect(resolveProxyRedirect('/login', false)).toBeNull();
  });

  test('sends signed-in visitors away from /login to /dashboard', () => {
    expect(resolveProxyRedirect('/login', true)).toBe('/dashboard');
  });

  test('lets signed-in visitors reach protected pages', () => {
    expect(resolveProxyRedirect('/dashboard', true)).toBeNull();
    expect(resolveProxyRedirect('/', true)).toBeNull();
  });
});
