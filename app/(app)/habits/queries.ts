import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeHabit, type HabitDTO } from '@/app/lib/habit-dto';

export type { HabitDTO };

export async function getHabits(): Promise<HabitDTO[]> {
  await verifySession();
  const habits = await prisma.habit.findMany({
    orderBy: { order: 'asc' },
    include: { logs: true },
  });
  return habits.map(serializeHabit);
}
