'use client';

import { useEffect } from 'react';

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
