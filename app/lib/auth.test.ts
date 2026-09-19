import { describe, test, expect } from 'vitest';
import { verifyCredentials } from '@/app/lib/auth';

describe('verifyCredentials', () => {
  test('accepts the configured email (case-insensitive) and password', async () => {
    await expect(verifyCredentials('Owner@Example.com', 'correct-password')).resolves.toBe(true);
  });

  test('rejects the wrong password', async () => {
    await expect(verifyCredentials('owner@example.com', 'wrong-password')).resolves.toBe(false);
  });

  test('rejects an unknown email', async () => {
    await expect(verifyCredentials('nobody@example.com', 'correct-password')).resolves.toBe(false);
  });
});
