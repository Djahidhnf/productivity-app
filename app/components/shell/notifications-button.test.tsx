import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/app/lib/push/actions', () => ({
  savePushSubscription: vi.fn(async () => {}),
  deletePushSubscription: vi.fn(async () => {}),
  sendTestNotification: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/app/login/actions', () => ({ logout: vi.fn(async () => {}) }));

import { NotificationsPanel, AccountContext } from './notifications-button';
import { savePushSubscription, deletePushSubscription, sendTestNotification } from '@/app/lib/push/actions';
import { logout } from '@/app/login/actions';

const fakeSubscription = {
  endpoint: 'https://push.example.com/abc',
  toJSON: () => ({ endpoint: 'https://push.example.com/abc', keys: { p256dh: 'p', auth: 'a' } }),
  unsubscribe: vi.fn(async () => true),
};

function installPush({ subscribed, permission = 'default' }: { subscribed: boolean; permission?: NotificationPermission }) {
  let current: typeof fakeSubscription | null = subscribed ? fakeSubscription : null;
  const pushManager = {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn(async () => (current = fakeSubscription)),
  };
  const registration = { pushManager };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn(async () => registration),
      register: vi.fn(async () => registration),
      ready: Promise.resolve(registration),
    },
  });
  vi.stubGlobal('PushManager', function PushManager() {});
  vi.stubGlobal('Notification', { permission, requestPermission: vi.fn(async () => 'granted') });
  return { pushManager };
}

function renderPanel() {
  return render(
    <AccountContext value="owner@example.com">
      <NotificationsPanel />
    </AccountContext>
  );
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U');
  vi.mocked(savePushSubscription).mockClear();
  vi.mocked(deletePushSubscription).mockClear();
  vi.mocked(logout).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // @ts-expect-error test cleanup of the stubbed property
  delete navigator.serviceWorker;
});

describe('NotificationsPanel', () => {
  test('says so when the browser has no push support', async () => {
    renderPanel();
    expect(await screen.findByText("This browser can't show push notifications.")).toBeInTheDocument();
  });

  test('explains Home Screen install on iOS Safari', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
    renderPanel();
    expect(await screen.findByText(/Add Klivr to your Home Screen/)).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  test('reports blocked permission', async () => {
    installPush({ subscribed: false, permission: 'denied' });
    renderPanel();
    expect(await screen.findByText(/Notifications are blocked/)).toBeInTheDocument();
  });

  test('enables push: subscribes and saves the subscription with the time zone', async () => {
    const { pushManager } = installPush({ subscribed: false });
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Enable on this device' }));
    await screen.findByText('Reminders are on for this device.');
    expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(savePushSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://push.example.com/abc',
        keys: { p256dh: 'p', auth: 'a' },
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    );
  });

  test('when on: sends a test, and turning off unsubscribes and deletes it', async () => {
    installPush({ subscribed: true });
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Send a test notification' }));
    await waitFor(() => expect(sendTestNotification).toHaveBeenCalledWith('https://push.example.com/abc'));
    await userEvent.click(screen.getByRole('button', { name: 'Turn off on this device' }));
    await waitFor(() => expect(deletePushSubscription).toHaveBeenCalledWith('https://push.example.com/abc'));
    expect(fakeSubscription.unsubscribe).toHaveBeenCalled();
  });

  test('shows the account and signs out, removing this device first', async () => {
    installPush({ subscribed: true });
    renderPanel();
    expect(screen.getByText('Signed in as owner@example.com')).toBeInTheDocument();
    await screen.findByText('Reminders are on for this device.');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(deletePushSubscription).toHaveBeenCalledWith('https://push.example.com/abc');
  });
});
