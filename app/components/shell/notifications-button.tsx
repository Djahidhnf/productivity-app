'use client';

import { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { Dialog } from '@/app/components/ui/dialog';
import { IconButton } from '@/app/components/ui/icon-button';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/icons';
import { deletePushSubscription, savePushSubscription, sendTestNotification } from '@/app/lib/push/actions';
import { logout } from '@/app/login/actions';

/** Email of the signed-in account; provided by AppShell. */
export const AccountContext = createContext<string>('');

type PushState = 'loading' | 'unsupported' | 'ios-install' | 'blocked' | 'unconfigured' | 'off' | 'on';

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return (await registration?.pushManager.getSubscription()) ?? null;
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  await savePushSubscription({
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
    userAgent: navigator.userAgent,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

async function readPushState(): Promise<PushState> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return isIos() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return 'unconfigured';
  if (Notification.permission === 'denied') return 'blocked';
  const subscription = await currentSubscription();
  if (subscription) {
    // Re-link the device to whoever is signed in now, and refresh the time zone.
    await saveSubscription(subscription);
    return 'on';
  }
  return 'off';
}

const MESSAGES: Partial<Record<PushState, string>> = {
  unsupported: "This browser can't show push notifications.",
  'ios-install': 'Add Klivr to your Home Screen (Share → Add to Home Screen), then open it from there to turn on notifications.',
  blocked: 'Notifications are blocked. Allow them in your browser’s site settings, then reopen this panel.',
  unconfigured: 'Notifications aren’t set up on the server yet (missing VAPID keys).',
  off: 'Get reminders for tasks and habits on this device.',
  on: 'Reminders are on for this device.',
};

export function NotificationsPanel() {
  const email = useContext(AccountContext);
  const [state, setState] = useState<PushState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    readPushState()
      .then((next) => !cancelled && setState(next))
      .catch(() => !cancelled && setState('unsupported'));
    return () => {
      cancelled = true;
    };
  }, []);

  function run(action: () => Promise<void>) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
      try {
        setState(await readPushState());
      } catch {
        setState('unsupported');
      }
    });
  }

  async function enable() {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    await saveSubscription(subscription);
  }

  async function disable() {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }

  async function test() {
    const subscription = await currentSubscription();
    if (!subscription) return;
    const { ok } = await sendTestNotification(subscription.endpoint);
    if (!ok) throw new Error('The test notification could not be sent.');
    setNotice('Sent — it should appear in a moment.');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--fg-2)' }} aria-live="polite">
        {state === 'loading' ? 'Checking this device…' : MESSAGES[state]}
      </p>
      {(state === 'off' || state === 'on') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {state === 'off' && (
            <Button size="sm" disabled={pending} onClick={() => run(enable)}>
              <Icon name="bell" size={15} />
              Enable on this device
            </Button>
          )}
          {state === 'on' && (
            <>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(test)}>
                Send a test notification
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(disable)}>
                Turn off on this device
              </Button>
            </>
          )}
        </div>
      )}
      {notice && <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>{notice}</p>}
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--danger-fg)' }}>
          {error}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          paddingTop: 12,
          borderTop: '1px solid var(--border-1)',
          fontSize: 'var(--text-xs)',
          color: 'var(--fg-3)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email && `Signed in as ${email}`}</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              // Don't leave this device sending the account's reminders to whoever signs in next.
              try {
                if ('serviceWorker' in navigator) await disable();
              } catch {
                // Signing out still matters more than the unsubscribe.
              }
              await logout();
            })
          }
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

/** Bell button that opens the notifications / account panel. */
export function NotificationsButton({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton label="Notifications" size={size} className={className} onClick={() => setOpen(true)}>
        <Icon name="bell" size={size === 'sm' ? 16 : 18} />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} title="Notifications" width={420}>
        {open && <NotificationsPanel />}
      </Dialog>
    </>
  );
}
