import { describe, test, expect } from 'vitest';
import { cleanEnvKey } from './env-key';
import { vapidKeyToBytes } from '@/app/components/shell/notifications-button';

const KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

describe('cleanEnvKey', () => {
  test('strips surrounding quotes and whitespace', () => {
    expect(cleanEnvKey(`"${KEY}"\n`)).toBe(KEY);
    expect(cleanEnvKey(` '${KEY}' `)).toBe(KEY);
    expect(cleanEnvKey(undefined)).toBe('');
  });
});

describe('vapidKeyToBytes', () => {
  test('decodes a public key, even when pasted with quotes', () => {
    const bytes = vapidKeyToBytes(`"${KEY}"`);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
  });

  test('rejects a private key or junk with a clear message', () => {
    expect(() => vapidKeyToBytes('Dt1CLgQlkiaA-tmCkATyKZeoF1-Gtw1-gdEP6pOCqj4')).toThrow(/not a valid public key/);
    expect(() => vapidKeyToBytes('not a key!')).toThrow(/not a valid public key/);
  });
});
