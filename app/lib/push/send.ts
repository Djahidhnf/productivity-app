import 'server-only';
import webpush from 'web-push';

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** 'gone' = the subscription no longer exists (404/410) and should be deleted. */
export type PushResult = 'sent' | 'gone' | 'failed';

export type PushSender = (target: PushTarget, payload: PushPayload) => Promise<PushResult>;

let configured = false;

function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be set');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export const sendPush: PushSender = async (target, payload) => {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 }
    );
    return 'sent';
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return 'gone';
    console.error('Push send failed', status, (error as Error).message);
    return 'failed';
  }
};
