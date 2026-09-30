import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { verifyCredentials } from '@/app/lib/auth';

describe('verifyCredentials', () => {
  test('accepts the configured email (case-insensitive) and password', async () => {
    await expect(verifyCredentials('Owner@Example.com', 'correct-password')).resolves.toBe('owner');
  });

  test('rejects the wrong password', async () => {
    await expect(verifyCredentials('owner@example.com', 'wrong-password')).resolves.toBeNull();
  });

  test('rejects an unknown email', async () => {
    await expect(verifyCredentials('nobody@example.com', 'correct-password')).resolves.toBeNull();
  });

  describe('with a second account configured', () => {
    beforeAll(() => {
      process.env.AUTH_EMAIL_2 = 'second@example.com';
      process.env.AUTH_PASSWORD_HASH_2 = bcrypt.hashSync('second-password', 4);
    });
    afterAll(() => {
      delete process.env.AUTH_EMAIL_2;
      delete process.env.AUTH_PASSWORD_HASH_2;
    });

    test('signs the second email in as the second account', async () => {
      await expect(verifyCredentials('second@example.com', 'second-password')).resolves.toBe('second');
    });

    test("does not accept one account's password for the other", async () => {
      await expect(verifyCredentials('second@example.com', 'correct-password')).resolves.toBeNull();
      await expect(verifyCredentials('owner@example.com', 'second-password')).resolves.toBeNull();
    });
  });

  test('ignores the second account when its env vars are unset', async () => {
    await expect(verifyCredentials('second@example.com', 'second-password')).resolves.toBeNull();
  });
});
