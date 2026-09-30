import { createHash, timingSafeEqual } from 'node:crypto';
import { dispatchReminders } from '@/app/lib/reminders/dispatch';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Called every minute by an external scheduler (cron-job.org) with
 * `Authorization: Bearer ${CRON_SECRET}`. /api is outside the auth proxy,
 * so the secret is the only guard.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'CRON_SECRET is not set' }, { status: 500 });

  const header = request.headers.get('authorization') ?? '';
  if (!timingSafeEqual(sha256(header), sha256(`Bearer ${secret}`))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json(await dispatchReminders());
}
