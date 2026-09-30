/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';

const cookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/app/lib/push/send', () => ({ sendPush: vi.fn(async () => 'sent') }));

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import type { AccountId } from '@/app/lib/accounts';
import { dispatchReminders } from './dispatch';
import { POST } from '@/app/api/reminders/dispatch/route';
import { savePushSubscription, deletePushSubscription } from '@/app/lib/push/actions';
import { createList, createTask, updateTask } from '@/app/(app)/tasks/actions';
import { createHabit } from '@/app/(app)/habits/actions';
import type { PushSender } from '@/app/lib/push/send';

const ENDPOINT = (name: string) => `https://push.example.com/dispatch-test-${name}`;

async function signInAs(account: AccountId) {
  cookieStore.set(SESSION_COOKIE_NAME, await encryptSession({ sub: account, expiresAt: Date.now() + 60_000 }));
}

async function subscribe(account: AccountId, name: string, timeZone = 'Africa/Algiers') {
  await signInAs(account);
  await savePushSubscription({ endpoint: ENDPOINT(name), keys: { p256dh: 'p', auth: 'a' }, userAgent: 'test', timeZone });
}

async function cleanup() {
  const tasks = await prisma.task.findMany({ where: { text: { startsWith: 'DispatchTest ' } }, select: { id: true } });
  const habits = await prisma.habit.findMany({ where: { name: { startsWith: 'DispatchTest ' } }, select: { id: true } });
  await prisma.reminderLog.deleteMany({ where: { itemId: { in: [...tasks, ...habits].map((i) => i.id) } } });
  await prisma.task.deleteMany({ where: { text: { startsWith: 'DispatchTest ' } } });
  await prisma.taskList.deleteMany({ where: { name: { startsWith: 'DispatchTest ' } } });
  await prisma.habit.deleteMany({ where: { name: { startsWith: 'DispatchTest ' } } });
  await prisma.pushSubscription.deleteMany({ where: { endpoint: { startsWith: ENDPOINT('') } } });
  await prisma.userSettings.deleteMany({ where: { userId: { in: ['owner', 'second'] } } });
}

describe('reminder dispatch', () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  test('the endpoint requires the bearer secret', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await POST(new Request('http://x/api/reminders/dispatch', { method: 'POST' }))).status).toBe(500);
    vi.stubEnv('CRON_SECRET', 'right-secret');
    expect((await POST(new Request('http://x', { method: 'POST' }))).status).toBe(401);
    const wrong = new Request('http://x', { method: 'POST', headers: { authorization: 'Bearer wrong' } });
    expect((await POST(wrong)).status).toBe(401);
    const right = new Request('http://x', { method: 'POST', headers: { authorization: 'Bearer right-secret' } });
    const response = await POST(right);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ sent: expect.any(Number), skipped: expect.any(Number) });
    vi.unstubAllEnvs();
  });

  test("sends a due task reminder once, only to its own account's devices", async () => {
    await subscribe('owner', 'owner-phone');
    await subscribe('second', 'second-phone');
    await signInAs('owner');
    const list = await createList('DispatchTest list');
    const task = await createTask({ text: 'DispatchTest call', listId: list.id });
    const updated = await updateTask({ id: task.id, text: task.text, listId: list.id, priority: null, due: '2026-10-05', dueTime: 14 * 60, reminderOffset: 30 });
    expect(updated.reminderOffset).toBe(30);

    const send = vi.fn<PushSender>(async () => 'sent');
    const now = new Date('2026-10-05T12:31:00Z'); // 13:31 Algiers; reminder was 13:30
    const first = await dispatchReminders({ now, send });
    expect(first.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ endpoint: ENDPOINT('owner-phone') });
    expect(send.mock.calls[0][1]).toMatchObject({ title: 'DispatchTest call', body: 'Due today at 2:00PM', url: '/tasks' });

    const second = await dispatchReminders({ now: new Date(now.getTime() + 60_000), send });
    expect(second).toMatchObject({ sent: 0, skipped: 1 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('a gone subscription is removed', async () => {
    await subscribe('owner', 'stale');
    await signInAs('owner');
    await createHabit({ name: 'DispatchTest stretch', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01', time: 7 * 60, reminderOffset: 0 });
    const send = vi.fn<PushSender>(async () => 'gone');
    const result = await dispatchReminders({ now: new Date('2026-10-05T06:00:30Z'), send });
    expect(result).toMatchObject({ sent: 1, removedSubscriptions: 1 });
    expect(await prisma.pushSubscription.count({ where: { endpoint: ENDPOINT('stale') } })).toBe(0);
  });

  test('push actions: upsert moves a device between accounts; delete is scoped to the account', async () => {
    await subscribe('owner', 'shared', 'Europe/Paris');
    expect(await prisma.userSettings.findUnique({ where: { userId: 'owner' } })).toMatchObject({ timeZone: 'Europe/Paris' });
    await subscribe('second', 'shared');
    expect(await prisma.pushSubscription.findUnique({ where: { endpoint: ENDPOINT('shared') } })).toMatchObject({ userId: 'second' });
    await signInAs('owner');
    await deletePushSubscription(ENDPOINT('shared'));
    expect(await prisma.pushSubscription.count({ where: { endpoint: ENDPOINT('shared') } })).toBe(1);
    await signInAs('second');
    await deletePushSubscription(ENDPOINT('shared'));
    expect(await prisma.pushSubscription.count({ where: { endpoint: ENDPOINT('shared') } })).toBe(0);
  });

  test('updateTask refits the reminder when the due date or time changes', async () => {
    await signInAs('owner');
    const list = await createList('DispatchTest refit');
    const task = await createTask({ text: 'DispatchTest refit', listId: list.id });
    const base = { id: task.id, text: task.text, listId: list.id, priority: null };
    expect((await updateTask({ ...base, due: '2026-10-05', dueTime: 600, reminderOffset: 30 })).reminderOffset).toBe(30);
    // Reminder omitted (e.g. calendar drag to all-day): kept, but refitted to whole days.
    expect((await updateTask({ ...base, due: '2026-10-06', dueTime: null })).reminderOffset).toBe(0);
    expect((await updateTask({ ...base, due: null, dueTime: null, reminderOffset: 1440 })).reminderOffset).toBeNull();
  });

  test('createHabit drops a reminder without a time and ignores days on daily habits', async () => {
    await signInAs('owner');
    const noTime = await createHabit({ name: 'DispatchTest a', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01', reminderOffset: 30 });
    expect(noTime).toMatchObject({ time: null, reminderOffset: null, reminderDays: null });
    const weekly = await createHabit({
      name: 'DispatchTest b',
      freqType: 'WEEKLY',
      timesPerWeek: 2,
      startDate: '2026-09-01',
      time: 18 * 60,
      reminderOffset: 60,
      reminderDays: 0b10000101,
    });
    expect(weekly).toMatchObject({ time: 1080, reminderOffset: 60, reminderDays: 0b0000101 });
  });
});
