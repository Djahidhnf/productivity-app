import { beforeEach, describe, test, expect, vi } from 'vitest';
import { cookies } from 'next/headers';
import { generateViewport } from '@/app/layout';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

function setThemeCookie(value?: string) {
  vi.mocked(cookies).mockResolvedValue({ get: () => (value ? { value } : undefined) } as never);
}

describe('generateViewport', () => {
  beforeEach(() => vi.mocked(cookies).mockReset());

  test('uses the light color for the light theme', async () => {
    setThemeCookie('light');
    await expect(generateViewport()).resolves.toEqual({ viewportFit: 'cover', themeColor: '#f8f9fb' });
  });

  test('uses the dark color for the dark theme', async () => {
    setThemeCookie('dark');
    await expect(generateViewport()).resolves.toEqual({ viewportFit: 'cover', themeColor: '#0a0d10' });
  });

  test('defaults to dark with no cookie', async () => {
    setThemeCookie();
    await expect(generateViewport()).resolves.toEqual({ viewportFit: 'cover', themeColor: '#0a0d10' });
  });
});
