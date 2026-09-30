import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { requireUserId } from '@/app/lib/dal';
import { serializeHabit, type HabitDTO } from '@/app/lib/habit-dto';

export type { HabitDTO };

export async function getHabits(): Promise<HabitDTO[]> {
  const userId = await requireUserId();
  const habits = await prisma.habit.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
    include: { logs: true },
  });
  return habits.map(serializeHabit);
}
