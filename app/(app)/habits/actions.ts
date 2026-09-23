'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { FreqType } from '@prisma/client';
import { serializeHabit, type HabitDTO } from '@/app/lib/habit-dto';

const HABIT_COLORS = ['#c6ff34', '#60a5fa', '#4ade80', '#fbbf24', '#f87171', '#d9ff70'];

function clampTimesPerWeek(freqType: FreqType, timesPerWeek: number | null): number | null {
  if (freqType !== 'WEEKLY') return null;
  const n = Number(timesPerWeek) || 1;
  return Math.min(7, Math.max(1, n));
}

export interface CreateHabitInput {
  name: string;
  freqType: FreqType;
  timesPerWeek: number | null;
  startDate: string;
}

export async function createHabit(input: CreateHabitInput): Promise<HabitDTO> {
  await verifySession();
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error('Habit name is required');
  const maxOrder = await prisma.habit.aggregate({ _max: { order: true } });
  const order = (maxOrder._max.order ?? -1) + 1;
  const habit = await prisma.habit.create({
    data: {
      name: trimmed,
      freqType: input.freqType,
      timesPerWeek: clampTimesPerWeek(input.freqType, input.timesPerWeek),
      startDate: new Date(input.startDate),
      order,
      color: HABIT_COLORS[order % HABIT_COLORS.length],
    },
    include: { logs: true },
  });
  revalidatePath('/habits', 'layout');
  return serializeHabit(habit);
}

export interface UpdateHabitInput {
  id: string;
  name: string;
  freqType: FreqType;
  timesPerWeek: number | null;
  startDate: string;
}

export async function updateHabit(input: UpdateHabitInput): Promise<HabitDTO> {
  await verifySession();
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error('Habit name is required');
  const habit = await prisma.habit.update({
    where: { id: input.id },
    data: {
      name: trimmed,
      freqType: input.freqType,
      timesPerWeek: clampTimesPerWeek(input.freqType, input.timesPerWeek),
      startDate: new Date(input.startDate),
    },
    include: { logs: true },
  });
  revalidatePath('/habits', 'layout');
  return serializeHabit(habit);
}

export async function deleteHabit(id: string): Promise<void> {
  await verifySession();
  await prisma.habit.delete({ where: { id } });
  revalidatePath('/habits', 'layout');
}

export async function reorderHabits(orderedIds: string[]): Promise<void> {
  await verifySession();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.habit.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath('/habits', 'layout');
}

export async function toggleHabitLog(habitId: string, date: string): Promise<void> {
  await verifySession();
  const dateValue = new Date(date);
  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: dateValue } },
  });
  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.habitLog.create({ data: { habitId, date: dateValue } });
  }
  revalidatePath('/habits', 'layout');
}
