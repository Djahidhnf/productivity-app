'use client';

import { useEffect } from 'react';
// Loaded here so the install event is caught on every page, including /login.
import '@/app/lib/install-prompt';

/** Registers the service worker on every page. Renders nothing. */
export function PwaSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      // The app works without the worker; only push and the offline screen are lost.
    });
  }, []);
  return null;
}
