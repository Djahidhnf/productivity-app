import type { MetadataRoute } from 'next';
import { NAV_ITEMS } from '@/app/components/shell/nav-items';

// Today is left out: start_url already opens it.
const SHORTCUT_KEYS = ['tasks', 'calendar', 'habits', 'notes'];

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Matches the identity browsers already derived from start_url, so existing installs stay the same app.
    id: '/dashboard',
    name: 'Klivr',
    short_name: 'Klivr',
    description: 'Personal productivity: tasks, calendar, matrix, habits, notes, finance.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#1a1a1a',
    theme_color: '#1a1a1a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: NAV_ITEMS.filter((item) => SHORTCUT_KEYS.includes(item.key)).map((item) => ({
      name: item.label,
      url: item.href,
    })),
  };
}
