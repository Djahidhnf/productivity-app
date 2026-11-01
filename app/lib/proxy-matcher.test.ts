// @vitest-environment node
import { describe, test, expect } from 'vitest';
import { config } from '@/proxy';

const runsProxy = (pathname: string) => new RegExp(`^${config.matcher[0]}$`).test(pathname);

describe('proxy matcher', () => {
  test('lets the offline page through without a session', () => {
    expect(runsProxy('/offline.html')).toBe(false);
  });

  test('still leaves the other public PWA files alone', () => {
    expect(runsProxy('/sw.js')).toBe(false);
    expect(runsProxy('/manifest.webmanifest')).toBe(false);
    expect(runsProxy('/icons/icon-192.png')).toBe(false);
  });

  test('still protects app pages', () => {
    expect(runsProxy('/dashboard')).toBe(true);
    expect(runsProxy('/tasks')).toBe(true);
  });
});
