import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { purgeExpiredTasks } from '@/app/lib/task-purge';
import { addDays } from '@/app/lib/calendar-dates';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';
import { serializeNote, type NoteDTO } from '@/app/lib/note-dto';

/**
 * Every open task, plus done ones dated within a day of `todayKey` (the
 * browser's "today" can be a day off the server's, and today's schedule
 * still lists finished tasks).
 */
export async function getDashboardTasks(todayKey: string): Promise<TaskDTO[]> {
  await verifySession();
  await purgeExpiredTasks();
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { done: false },
        { due: { gte: new Date(addDays(todayKey, -1)), lte: new Date(addDays(todayKey, 1)) } },
      ],
    },
    orderBy: [{ due: 'asc' }, { dueTime: 'asc' }, { createdAt: 'asc' }],
  });
  return tasks.map(serializeTask);
}

export async function getRecentNotes(limit: number): Promise<NoteDTO[]> {
  await verifySession();
  const notes = await prisma.note.findMany({ orderBy: { updatedAt: 'desc' }, take: limit });
  return notes.map(serializeNote);
}
