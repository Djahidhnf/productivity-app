'use server';

import { prisma } from '@/app/lib/prisma';
import { requireUserId } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { FreqType } from '@prisma/client';
import { serializeHabit, type HabitDTO } from '@/app/lib/habit-dto';
import { ALL_WEEKDAYS_MASK, normalizeReminderOffset } from '@/app/lib/reminders/offsets';

const HABIT_COLORS = ['#c6ff34', '#60a5fa', '#4ade80', '#fbbf24', '#f87171', '#d9ff70'];

function clampTimesPerWeek(freqType: FreqType, timesPerWeek: number | null): number | null {
  if (freqType !== 'WEEKLY') return null;
  const n = Number(timesPerWeek) || 1;
  return Math.min(7, Math.max(1, n));
}

export interface HabitReminderInput {
  /** Minutes after local midnight; null = no time. */
  time?: number | null;
  /** Minutes before `time`; null = never. Needs a time. */
  reminderOffset?: number | null;
  /** WEEKLY only: weekday mask, bit 0 = Monday. */
  reminderDays?: number | null;
}

/** Validated reminder columns; omitted input fields read as "none". */
function habitReminderData(freqType: FreqType, input: HabitReminderInput) {
  const time = Number.isInteger(input.time) && input.time! >= 0 && input.time! < 24 * 60 ? input.time! : null;
  const offset = typeof input.reminderOffset === 'number' ? input.reminderOffset : null;
  const reminderOffset = normalizeReminderOffset(offset, time == null ? 'disabled' : 'timed');
  const reminderDays =
    freqType === 'WEEKLY' && Number.isInteger(input.reminderDays) ? input.reminderDays! & ALL_WEEKDAYS_MASK : null;
  return { time, reminderOffset, reminderDays };
}

export interface CreateHabitInput extends HabitReminderInput {
  name: string;
  freqType: FreqType;
  timesPerWeek: number | null;
  startDate: string;
}

export async function createHabit(input: CreateHabitInput): Promise<HabitDTO> {
  const userId = await requireUserId();
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error('Habit name is required');
  const maxOrder = await prisma.habit.aggregate({ where: { userId }, _max: { order: true } });
  const order = (maxOrder._max.order ?? -1) + 1;
  const habit = await prisma.habit.create({
    data: {
      userId,
      name: trimmed,
      freqType: input.freqType,
      timesPerWeek: clampTimesPerWeek(input.freqType, input.timesPerWeek),
      startDate: new Date(input.startDate),
      ...habitReminderData(input.freqType, input),
      order,
      color: HABIT_COLORS[order % HABIT_COLORS.length],
    },
    include: { logs: true },
  });
  revalidatePath('/habits', 'layout');
  return serializeHabit(habit);
}

export interface UpdateHabitInput extends HabitReminderInput {
  id: string;
  name: string;
  freqType: FreqType;
  timesPerWeek: number | null;
  startDate: string;
}

export async function updateHabit(input: UpdateHabitInput): Promise<HabitDTO> {
  const userId = await requireUserId();
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error('Habit name is required');
  const habit = await prisma.habit.update({
    where: { id: input.id, userId },
    data: {
      name: trimmed,
      freqType: input.freqType,
      timesPerWeek: clampTimesPerWeek(input.freqType, input.timesPerWeek),
      startDate: new Date(input.startDate),
      ...habitReminderData(input.freqType, input),
    },
    include: { logs: true },
  });
  revalidatePath('/habits', 'layout');
  return serializeHabit(habit);
}

export async function deleteHabit(id: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.habit.delete({ where: { id, userId } });
  revalidatePath('/habits', 'layout');
}

export async function reorderHabits(orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.habit.update({ where: { id, userId }, data: { order: index } }))
  );
  revalidatePath('/habits', 'layout');
}

export async function toggleHabitLog(habitId: string, date: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.habit.findFirstOrThrow({ where: { id: habitId, userId }, select: { id: true } });
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
