import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { toDateKey } from '@/app/lib/task-dto';
import { sendPush, type PushSender } from '@/app/lib/push/send';
import { dueReminders } from './compute';

const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export interface DispatchResult {
  sent: number;
  skipped: number;
  removedSubscriptions: number;
}

/**
 * Sends every reminder due at `now` to all of its account's devices, once.
 * Each reminder is claimed by inserting its ReminderLog row first; the
 * unique (kind, itemId, fireAt) constraint makes overlapping runs skip it.
 */
export async function dispatchReminders({ now = new Date(), send = sendPush }: { now?: Date; send?: PushSender } = {}): Promise<DispatchResult> {
  const result: DispatchResult = { sent: 0, skipped: 0, removedSubscriptions: 0 };
  const subscriptions = await prisma.pushSubscription.findMany();
  const userIds = [...new Set(subscriptions.map((s) => s.userId))];
  // Logs from a week back cover weekly-habit counts and "1 day before" occurrences.
  const logsFrom = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

  for (const userId of userIds) {
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    const timeZone = settings?.timeZone ?? 'UTC';
    const [tasks, habits] = await Promise.all([
      prisma.task.findMany({ where: { userId, done: false, due: { not: null }, reminderOffset: { not: null } } }),
      prisma.habit.findMany({
        where: { userId, time: { not: null }, reminderOffset: { not: null } },
        include: { logs: { where: { date: { gte: logsFrom } } } },
      }),
    ]);

    const reminders = dueReminders({
      now,
      timeZone,
      tasks: tasks.map((t) => ({ ...t, due: toDateKey(t.due) })),
      habits: habits.map((h) => ({ ...h, startDate: toDateKey(h.startDate)!, logs: h.logs.map((l) => toDateKey(l.date)!) })),
    });
    if (reminders.length === 0) continue;

    let targets = subscriptions.filter((s) => s.userId === userId);
    for (const reminder of reminders) {
      try {
        await prisma.reminderLog.create({ data: { kind: reminder.kind, itemId: reminder.itemId, fireAt: reminder.fireAt } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          result.skipped++;
          continue;
        }
        throw error;
      }
      const { title, body, url, tag } = reminder;
      for (const target of targets) {
        const outcome = await send(target, { title, body, url, tag });
        if (outcome === 'gone') {
          await prisma.pushSubscription.deleteMany({ where: { id: target.id } });
          targets = targets.filter((t) => t.id !== target.id);
          result.removedSubscriptions++;
        }
      }
      result.sent++;
    }
  }

  await prisma.reminderLog.deleteMany({ where: { sentAt: { lt: new Date(now.getTime() - LOG_RETENTION_MS) } } });
  return result;
}
