'use server';

import { prisma } from '@/app/lib/prisma';
import { requireUserId } from '@/app/lib/dal';
import { isValidTimeZone } from '@/app/lib/reminders/zoned';
import { sendPush } from '@/app/lib/push/send';

export interface SavePushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string;
  timeZone: string;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Registers this device for the signed-in account and records its time zone. */
export async function savePushSubscription(input: SavePushSubscriptionInput): Promise<void> {
  const userId = await requireUserId();
  if (!isHttpsUrl(input.endpoint)) throw new Error('Invalid endpoint');
  if (typeof input.keys?.p256dh !== 'string' || typeof input.keys?.auth !== 'string') throw new Error('Invalid keys');
  const userAgent = String(input.userAgent ?? '').slice(0, 500);
  const data = { userId, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent };
  // A browser keeps its endpoint across sign-ins, so upserting moves the device to whoever enabled it last.
  await prisma.pushSubscription.upsert({ where: { endpoint: input.endpoint }, create: { endpoint: input.endpoint, ...data }, update: data });
  if (isValidTimeZone(input.timeZone)) {
    await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, timeZone: input.timeZone },
      update: { timeZone: input.timeZone },
    });
  }
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
}

/** Sends a test notification to one of the account's own devices. */
export async function sendTestNotification(endpoint: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const target = await prisma.pushSubscription.findFirst({ where: { endpoint, userId } });
  if (!target) return { ok: false };
  const outcome = await sendPush(target, {
    title: 'Notifications are working',
    body: 'Klivr will remind you here.',
    url: '/dashboard',
    tag: 'test',
  });
  if (outcome === 'gone') await prisma.pushSubscription.deleteMany({ where: { id: target.id } });
  return { ok: outcome === 'sent' };
}
