import { describe, test, expect } from 'vitest';
import manifest from '@/app/manifest';
import { NAV_ITEMS } from '@/app/components/shell/nav-items';

describe('manifest', () => {
  test('keeps the identity existing installs already have', () => {
    const result = manifest();
    expect(result.id).toBe('/dashboard');
    expect(result.start_url).toBe('/dashboard');
    expect(result.scope).toBe('/');
  });

  test('offers shortcuts to Tasks, Calendar, Habits and Notes', () => {
    expect(manifest().shortcuts).toEqual([
      { name: 'Tasks', url: '/tasks' },
      { name: 'Calendar', url: '/calendar' },
      { name: 'Habits', url: '/habits' },
      { name: 'Notes', url: '/notes' },
    ]);
  });

  test('every shortcut points at a real nav destination', () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    for (const shortcut of manifest().shortcuts ?? []) {
      expect(hrefs).toContain(shortcut.url);
    }
  });
});
