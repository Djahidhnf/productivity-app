import { describe, test, expect } from 'vitest';

describe('test harness', () => {
  test('runs and sees the seeded env vars', () => {
    expect(process.env.SESSION_SECRET).toBeDefined();
    expect(process.env.AUTH_EMAIL).toBe('owner@example.com');
  });
});
