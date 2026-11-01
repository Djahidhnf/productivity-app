'use client';

import { useSyncExternalStore } from 'react';

/** Chrome and Edge's install event; not in the DOM type library. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function setDeferred(next: BeforeInstallPromptEvent | null) {
  deferred = next;
  listeners.forEach((listener) => listener());
}

// Attached when the module loads, not on mount: the event can fire on /login, before AppShell exists.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    setDeferred(event as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => setDeferred(null));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function install() {
  if (!deferred) return;
  const prompted = deferred.prompt();
  // Each event can only prompt once.
  setDeferred(null);
  await prompted;
}

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false
  );
  return { canInstall, install };
}
