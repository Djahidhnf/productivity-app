/**
 * @vitest-environment node
 */
import { describe, test, expect } from 'vitest';
import { encryptSession, decryptSession } from '@/app/lib/session';

describe('session encrypt/decrypt', () => {
  test('round-trips a valid session', async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    const payload = await decryptSession(token);
    expect(payload?.sub).toBe('owner');
  });

  test('round-trips the second account', async () => {
    const token = await encryptSession({ sub: 'second', expiresAt: Date.now() + 60_000 });
    await expect(decryptSession(token)).resolves.toMatchObject({ sub: 'second' });
  });

  test('rejects a token for an unknown account', async () => {
    const token = await encryptSession({ sub: 'intruder' as never, expiresAt: Date.now() + 60_000 });
    await expect(decryptSession(token)).resolves.toBeNull();
  });

  test('rejects a garbage token', async () => {
    await expect(decryptSession('not-a-real-token')).resolves.toBeNull();
  });

  test('rejects an undefined token', async () => {
    await expect(decryptSession(undefined)).resolves.toBeNull();
  });
});
