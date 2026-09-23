# Habits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Habits screen at `/habits` — a compact-list + detail-panel habit tracker over the existing `Habit`/`HabitLog` tables, with drag-to-reorder, a per-habit GitHub-style heatmap, a month calendar picker, and day-streak/monthly-% stat tiles.

**Architecture:** Habits is the 5th of 7 rollout phases (Foundation → Tasks → Matrix → Calendar → **Habits** → Journal → Dashboard), all previously merged to `master`. Like Matrix and Calendar before it, one Server Component query fetches every habit (with its full log history) once; the client owns all derived state (streaks, percentages, heatmap cells, month-grid cells) as pure, synchronously-computed functions over that one array — no per-navigation network round-trips. Every mutation (create/edit/delete/reorder/toggle-a-day's-log) is a Server Action, applied optimistically client-side and reverted with a `window.alert` on failure, exactly matching the pattern established in the Tasks and Matrix phases.

**Tech Stack:** Same as every prior phase — Next.js 16 App Router Server Components/Actions, Prisma 7 + Postgres, Vitest + React Testing Library.

## Global Constraints

- Single-user app — no `userId` anywhere, no auth beyond the existing session.
- Every server-side data access calls `verifySession()` from `@/app/lib/dal` as its first statement; `import 'server-only'` is the first import in `queries.ts`; `'use server'` is the first line of `actions.ts`. Matches every prior phase.
- **`revalidatePath('/habits', 'layout')` exactly once per Server Action** — no growing per-page path list. Matches the convention fixed project-wide in the Calendar phase's Task 1 (`app/(app)/tasks/actions.ts` and this file's own actions both do this; `/habits` is a distinct top-level route under the same `app/(app)/layout.tsx`, so its own literal path is what each Habits action revalidates — it does not need to also revalidate `/tasks`, since Habits reads and writes only the `Habit`/`HabitLog` tables, never `Task`).
- **Sunday week start, hardcoded, project-wide** (design spec §5 — no settings screen exists). The month calendar picker reuses `buildMonthGrid`/`addMonths`/`monthYearLabel` from `@/app/lib/calendar-dates` exactly as-is — do not reimplement a month grid or accept a `weekStart` parameter anywhere.
- **Always pass an explicit `'en-US'` locale to any `toLocaleDateString` call, never `undefined`.** This dev/CI environment's default Node locale is French, discovered and fixed project-wide in the Calendar phase (`new Date().toLocaleDateString(undefined, {...})` silently returns French text here, and would show the wrong language to every real user too — this app has no i18n). This phase should need **zero** new `toLocaleDateString` calls, since it reuses `calendar-dates.ts`'s already-'en-US'-safe `shortDateLabel`/`monthYearLabel` — this rule is stated as a guardrail in case any task reaches for a fresh one.
- **`CheckToggle` (`@/app/components/ui/check-toggle`) for every done/checkbox surface — never a raw `<input type="checkbox">`.** A raw checkbox was a real UI-consistency regression caught and fixed in the Calendar phase; do not repeat it here on the habit card's "done today" toggle.
- **`PillToggle` (`@/app/components/ui/pill-toggle`) for the Daily/Weekly frequency toggle** in the habit dialog, instead of bespoke pill buttons — matches how Matrix reused it for its own two-way switch.
- **Drag-to-reorder is desktop-only native HTML5 DnD — no touch/long-press support.** The Tasks phase's own list/task drag-reorder (`app/(app)/tasks/`) is HTML5-only with zero touch-event handlers (confirmed directly); Habits' "drag to reorder" (design spec §4.5) follows that same precedent. Matrix's 280ms-long-press touch implementation was a requirement the design spec stated explicitly and only for Matrix's flag-a-task-onto-a-quadrant gesture (spec lines 165-167) — it does not generalize to every drag interaction in the app.
- **No "Objective date" / `endDate` field, anywhere.** The mockup's habit dialog has an "Objective date" input, but the `Habit` schema (Foundation phase, already migrated) has no such column, and design spec §4.5's own prose never mentions one. Drop it from the dialog entirely — do not add a migration for it.
- **Heatmap cells and month-picker cells use different non-interactive rules, faithfully copied from the mockup, not "fixed":** a heatmap cell is non-interactive when its date is in the future **or** before the habit's `startDate`; a month-picker cell is non-interactive only when its date is in the future (it does **not** also check `startDate`). This exact asymmetry exists in the mockup's own `buildHeat`/`buildHabitMonth` functions — Calendar and Matrix both established the practice of copying mockup behavior precisely rather than "correcting" it, and this phase continues that practice.
- **Streak/percent logic is preserved exactly from the mockup** (design spec §4.5 says so explicitly): day streak walks backward from today, starting from yesterday instead if today isn't logged yet; this-month % is check-ins-this-month ÷ days-elapsed-this-month for daily habits, or check-ins-this-month ÷ (weeks-elapsed × timesPerWeek) for weekly habits, capped at 100%.
- **Every pure calculation function takes an explicit `todayKey: string` parameter — never calls `new Date()` or `todayKey()` internally.** This is what let the Calendar phase test all its date-dependent logic with plain fixed strings instead of `vi.useFakeTimers()`; the same discipline applies to every function in `habit-calc.ts`.
- **Master-detail responsive split matches Matrix's own pattern exactly:** `.pw-habit-split`/`.pw-habit-left`/`.pw-habit-right` CSS classes already exist in `app/styles/layout.css` (added during the Foundation phase's CSS-copy step, even though `/habits` has been a stub until now) and already stack the two panes at `≤900px` via an existing media query — no CSS changes are needed this phase. On top of that CSS-only stacking, a JS `isNarrow = useMediaQuery('(max-width: 860px)')` (from `@/app/lib/use-media-query`, already used by `matrix-board.tsx`) drives a single-pane-at-a-time "master-detail" mode with a back button, matching design spec §4.5's "≤860px master-detail (list or detail, not both, with a back button)".
- **Dashboard integration is explicitly out of scope for this phase.** Design spec §4.2 mentions a "top 4 habits" dashboard widget, but the rollout plan builds Dashboard last, aggregating over Tasks/Habits/Journal once all three exist. Do not touch `app/(app)/dashboard/`.
- Every optimistic client-side mutation reverts its local state and shows a `window.alert(...)` on failure, from the first version shipped, matching every prior phase.
- No placeholders, no TODOs — every task ships working, tested code.

---

## Task 1: Habit DTO + read query

**Files:**
- Create: `app/lib/habit-dto.ts`
- Create: `app/(app)/habits/queries.ts`
- Create: `app/(app)/habits/queries.integration.test.ts`

**Interfaces:**
- Produces: `HabitDTO { id: string; name: string; color: string; freqType: 'DAILY' | 'WEEKLY'; timesPerWeek: number | null; startDate: string; order: number; logs: string[] }`, `serializeHabit(habit): HabitDTO` (both from `app/lib/habit-dto.ts`), `getHabits(): Promise<HabitDTO[]>` (from `app/(app)/habits/queries.ts`, re-exports `HabitDTO`).
- Consumes: `toDateKey` from `@/app/lib/task-dto` (already exported, reused as-is — a plain `Date -> 'YYYY-MM-DD'` UTC-slice helper for `@db.Date` columns, not task-specific despite its file name), `prisma` from `@/app/lib/prisma`, `verifySession` from `@/app/lib/dal`.
- Consumed by (later tasks): every component and Server Action in this plan imports `HabitDTO` from `./queries` (matching how `TaskDTO` is re-exported from each phase's own `queries.ts`).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/habits/queries.integration.test.ts`:
```ts
/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll } from 'vitest';

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

import { vi } from 'vitest';
import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { getHabits } from './queries';

describe('getHabits', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.habit.deleteMany({ where: { name: { startsWith: 'HabitsQueryTest ' } } });
  });

  test('returns habits ordered by order, with their logs as date-key strings', async () => {
    const b = await prisma.habit.create({
      data: { name: 'HabitsQueryTest B', color: '#60a5fa', freqType: 'DAILY', startDate: new Date('2026-01-01'), order: 1 },
    });
    const a = await prisma.habit.create({
      data: { name: 'HabitsQueryTest A', color: '#c6ff34', freqType: 'WEEKLY', timesPerWeek: 3, startDate: new Date('2026-01-01'), order: 0 },
    });
    await prisma.habitLog.create({ data: { habitId: a.id, date: new Date('2026-09-20') } });
    await prisma.habitLog.create({ data: { habitId: a.id, date: new Date('2026-09-21') } });

    const result = await getHabits();
    const names = result.map((h) => h.name);
    expect(names.indexOf('HabitsQueryTest A')).toBeLessThan(names.indexOf('HabitsQueryTest B'));

    const habitA = result.find((h) => h.id === a.id)!;
    expect(habitA.logs.sort()).toEqual(['2026-09-20', '2026-09-21']);
    expect(habitA.freqType).toBe('WEEKLY');
    expect(habitA.timesPerWeek).toBe(3);
    expect(habitA.startDate).toBe('2026-01-01');

    const habitB = result.find((h) => h.id === b.id)!;
    expect(habitB.logs).toEqual([]);
    expect(habitB.timesPerWeek).toBeNull();

    await prisma.habit.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — `./queries` doesn't exist yet.

- [ ] **Step 3: Write the DTO helper**

Create `app/lib/habit-dto.ts`:
```ts
import type { FreqType } from '@prisma/client';
import { toDateKey } from './task-dto';

export interface HabitDTO {
  id: string;
  name: string;
  color: string;
  freqType: FreqType;
  timesPerWeek: number | null;
  startDate: string;
  order: number;
  logs: string[];
}

export function serializeHabit(habit: {
  id: string;
  name: string;
  color: string;
  freqType: FreqType;
  timesPerWeek: number | null;
  startDate: Date;
  order: number;
  logs: { date: Date }[];
}): HabitDTO {
  return {
    id: habit.id,
    name: habit.name,
    color: habit.color,
    freqType: habit.freqType,
    timesPerWeek: habit.timesPerWeek,
    startDate: toDateKey(habit.startDate)!,
    order: habit.order,
    logs: habit.logs.map((log) => toDateKey(log.date)!),
  };
}
```

- [ ] **Step 4: Write the query**

Create `app/(app)/habits/queries.ts`:
```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:integration`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/lib/habit-dto.ts "app/(app)/habits/queries.ts" "app/(app)/habits/queries.integration.test.ts"
git commit -m "feat: add Habit DTO and getHabits query"
```

---

## Task 2: Server actions — create/update/delete/reorder/toggle-log

**Files:**
- Create: `app/(app)/habits/actions.ts`
- Create: `app/(app)/habits/actions.integration.test.ts`

**Interfaces:**
- Produces: `CreateHabitInput { name: string; freqType: FreqType; timesPerWeek: number | null; startDate: string }`, `createHabit(input): Promise<HabitDTO>`; `UpdateHabitInput { id: string; name: string; freqType: FreqType; timesPerWeek: number | null; startDate: string }`, `updateHabit(input): Promise<HabitDTO>`; `deleteHabit(id: string): Promise<void>`; `reorderHabits(orderedIds: string[]): Promise<void>`; `toggleHabitLog(habitId: string, date: string): Promise<void>`.
- Consumes: `HabitDTO`/`serializeHabit` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/habits/actions.integration.test.ts`:
```ts
/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';

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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { revalidatePath } from 'next/cache';
import { createHabit, updateHabit, deleteHabit, reorderHabits, toggleHabitLog } from './actions';

describe('habit server actions', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
  });

  afterEach(async () => {
    await prisma.habit.deleteMany({ where: { name: { startsWith: 'ActionTest ' } } });
  });

  test('createHabit assigns the next order and cycles through HABIT_COLORS', async () => {
    const maxBefore = await prisma.habit.aggregate({ _max: { order: true } });
    const habit = await createHabit({ name: 'ActionTest Daily', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    expect(habit.order).toBe((maxBefore._max.order ?? -1) + 1);
    expect(habit.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(habit.timesPerWeek).toBeNull();
    expect(habit.logs).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('createHabit clamps timesPerWeek to 1-7 for weekly habits', async () => {
    const habit = await createHabit({ name: 'ActionTest Weekly', freqType: 'WEEKLY', timesPerWeek: 99, startDate: '2026-09-01' });
    expect(habit.timesPerWeek).toBe(7);
    const habit2 = await createHabit({ name: 'ActionTest Weekly2', freqType: 'WEEKLY', timesPerWeek: 0, startDate: '2026-09-01' });
    expect(habit2.timesPerWeek).toBe(1);
  });

  test('createHabit rejects an empty name', async () => {
    await expect(createHabit({ name: '   ', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' })).rejects.toThrow();
  });

  test('updateHabit preserves color, order, and logs', async () => {
    const habit = await createHabit({ name: 'ActionTest ToEdit', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    await toggleHabitLog(habit.id, '2026-09-10');
    vi.mocked(revalidatePath).mockClear();
    const updated = await updateHabit({ id: habit.id, name: 'ActionTest Edited', freqType: 'WEEKLY', timesPerWeek: 4, startDate: '2026-09-02' });
    expect(updated.name).toBe('ActionTest Edited');
    expect(updated.freqType).toBe('WEEKLY');
    expect(updated.timesPerWeek).toBe(4);
    expect(updated.startDate).toBe('2026-09-02');
    expect(updated.color).toBe(habit.color);
    expect(updated.order).toBe(habit.order);
    expect(updated.logs).toEqual(['2026-09-10']);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('deleteHabit cascades to delete its logs', async () => {
    const habit = await createHabit({ name: 'ActionTest ToDelete', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    await toggleHabitLog(habit.id, '2026-09-10');
    vi.mocked(revalidatePath).mockClear();
    await deleteHabit(habit.id);
    const found = await prisma.habit.findUnique({ where: { id: habit.id } });
    expect(found).toBeNull();
    const logs = await prisma.habitLog.findMany({ where: { habitId: habit.id } });
    expect(logs).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('reorderHabits sets each habit order to its array index', async () => {
    const a = await createHabit({ name: 'ActionTest ReorderA', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    const b = await createHabit({ name: 'ActionTest ReorderB', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    vi.mocked(revalidatePath).mockClear();
    await reorderHabits([b.id, a.id]);
    const refreshedA = await prisma.habit.findUniqueOrThrow({ where: { id: a.id } });
    const refreshedB = await prisma.habit.findUniqueOrThrow({ where: { id: b.id } });
    expect(refreshedB.order).toBe(0);
    expect(refreshedA.order).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('toggleHabitLog creates then deletes a log for the same date', async () => {
    const habit = await createHabit({ name: 'ActionTest Toggle', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-09-01' });
    vi.mocked(revalidatePath).mockClear();
    await toggleHabitLog(habit.id, '2026-09-15');
    let logs = await prisma.habitLog.findMany({ where: { habitId: habit.id } });
    expect(logs).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith('/habits', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);

    vi.mocked(revalidatePath).mockClear();
    await toggleHabitLog(habit.id, '2026-09-15');
    logs = await prisma.habitLog.findMany({ where: { habitId: habit.id } });
    expect(logs).toHaveLength(0);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — `./actions` doesn't exist yet.

- [ ] **Step 3: Implement the actions**

Create `app/(app)/habits/actions.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:integration`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/habits/actions.ts" "app/(app)/habits/actions.integration.test.ts"
git commit -m "feat: add habit create/update/delete/reorder/toggle-log server actions"
```

---

## Task 3: Pure calculation functions — streak, monthly %, heatmap, month cells, reorder

**Files:**
- Create: `app/(app)/habits/habit-calc.ts`
- Create: `app/(app)/habits/habit-calc.test.ts`

**Interfaces:**
- Produces: `habitStreak(logs: string[], todayKey: string): number`; `habitMonthlyPct(habit: { freqType: FreqType; timesPerWeek: number | null }, logs: string[], todayKey: string): number`; `HeatCell { dateKey: string; logged: boolean; future: boolean; beforeStart: boolean }`, `buildHeatCells(logs: string[], startDate: string, todayKey: string, weeks: number): { cells: HeatCell[]; startLabel: string }`; `HabitMonthCell { dateKey: string; inMonth: boolean; logged: boolean; isToday: boolean; future: boolean; dayNum: number }`, `buildHabitMonthCells(logs: string[], monthKey: string, todayKey: string): HabitMonthCell[]`; `moveHabit<T extends { id: string }>(habits: T[], draggedId: string, targetId: string): T[]`.
- Consumes: `addDays`, `buildMonthGrid`, `shortDateLabel` from `@/app/lib/calendar-dates`.
- Consumed by (later tasks): `habit-card.tsx` (streak, heatmap), `habit-detail.tsx` (streak, monthly %, month cells), `habits-board.tsx` (`moveHabit` for drag-reorder).

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/habits/habit-calc.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { habitStreak, habitMonthlyPct, buildHeatCells, buildHabitMonthCells, moveHabit } from './habit-calc';

describe('habitStreak', () => {
  test('counts backward from today when today is logged', () => {
    expect(habitStreak(['2026-09-21', '2026-09-22', '2026-09-23'], '2026-09-23')).toBe(3);
  });

  test('starts from yesterday when today is not yet logged, so a streak is banked before check-in', () => {
    expect(habitStreak(['2026-09-21', '2026-09-22'], '2026-09-23')).toBe(2);
  });

  test('returns 0 when neither today nor yesterday is logged', () => {
    expect(habitStreak(['2026-09-10'], '2026-09-23')).toBe(0);
  });

  test('stops at the first gap', () => {
    expect(habitStreak(['2026-09-19', '2026-09-21', '2026-09-22', '2026-09-23'], '2026-09-23')).toBe(3);
  });
});

describe('habitMonthlyPct', () => {
  test('daily habit: check-ins this month over days elapsed this month', () => {
    const logs = ['2026-09-01', '2026-09-02', '2026-08-31', '2026-09-23'];
    const pct = habitMonthlyPct({ freqType: 'DAILY', timesPerWeek: null }, logs, '2026-09-23');
    // 3 check-ins in September (08-31 excluded) / 23 days elapsed = 13%
    expect(pct).toBe(Math.round((3 / 23) * 100));
  });

  test('weekly habit: check-ins over (weeks elapsed * timesPerWeek)', () => {
    const logs = ['2026-09-01', '2026-09-08', '2026-09-15'];
    const pct = habitMonthlyPct({ freqType: 'WEEKLY', timesPerWeek: 2 }, logs, '2026-09-23');
    // daysElapsed=23 -> weeksElapsed=ceil(23/7)=4, goal=8, completions=3
    expect(pct).toBe(Math.round((3 / 8) * 100));
  });

  test('caps at 100%', () => {
    const logs = Array.from({ length: 23 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
    const pct = habitMonthlyPct({ freqType: 'DAILY', timesPerWeek: null }, logs, '2026-09-23');
    expect(pct).toBe(100);
  });

  test('never divides by zero on day 1 of the month', () => {
    const pct = habitMonthlyPct({ freqType: 'DAILY', timesPerWeek: null }, [], '2026-09-01');
    expect(pct).toBe(0);
    expect(Number.isFinite(pct)).toBe(true);
  });
});

describe('buildHeatCells', () => {
  test('returns weeks*7 cells in date-sequential order, grid aligned to the Sunday starting the current week', () => {
    const { cells } = buildHeatCells([], '2026-01-01', '2026-09-23', 4);
    expect(cells).toHaveLength(28);
    expect(new Date(`${cells[0].dateKey}T00:00:00`).getDay()).toBe(0); // Sunday
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].dateKey > cells[i - 1].dateKey).toBe(true);
    }
    // 2026-09-23 is a Wednesday, so the grid's final (current) week runs through
    // Saturday 2026-09-26 — the grid always contains today, not necessarily as
    // its last cell, matching a real GitHub-style contribution graph where each
    // column is a fixed calendar week and the current week's remaining days
    // render as blank/future rather than being excluded from the grid.
    expect(cells.some((c) => c.dateKey === '2026-09-23')).toBe(true);
  });

  test('marks logged, future, and beforeStart correctly', () => {
    const { cells } = buildHeatCells(['2026-09-23'], '2026-09-22', '2026-09-23', 1);
    const byDate = Object.fromEntries(cells.map((c) => [c.dateKey, c]));
    expect(byDate['2026-09-23'].logged).toBe(true);
    expect(byDate['2026-09-23'].future).toBe(false);
    expect(byDate['2026-09-20'].beforeStart).toBe(true); // grid's Sunday start is before the habit's startDate
    expect(byDate['2026-09-22'].beforeStart).toBe(false); // the startDate itself is not "before start"
    expect(byDate['2026-09-24'].future).toBe(true); // this week's remaining days (after today) are future
    expect(byDate['2026-09-26'].future).toBe(true);
  });

  test('startLabel matches the first cell date, formatted', () => {
    const { cells, startLabel } = buildHeatCells([], '2026-01-01', '2026-09-23', 2);
    expect(startLabel.length).toBeGreaterThan(0);
    expect(cells[0].dateKey <= '2026-09-23').toBe(true);
  });
});

describe('buildHabitMonthCells', () => {
  test('returns 42 cells for September 2026, Sunday-start', () => {
    const cells = buildHabitMonthCells([], '2026-09-01', '2026-09-23');
    expect(cells).toHaveLength(42);
    expect(cells[0].dateKey).toBe('2026-08-30'); // Sept 1 2026 is a Tuesday, grid starts Sunday Aug 30
  });

  test('marks logged, isToday, and future correctly, ignoring startDate', () => {
    const cells = buildHabitMonthCells(['2026-09-23'], '2026-09-01', '2026-09-23');
    const today = cells.find((c) => c.dateKey === '2026-09-23')!;
    expect(today.logged).toBe(true);
    expect(today.isToday).toBe(true);
    expect(today.future).toBe(false);
    const future = cells.find((c) => c.dateKey === '2026-09-24')!;
    expect(future.future).toBe(true);
  });

  test('dayNum matches the date-of-month', () => {
    const cells = buildHabitMonthCells([], '2026-09-01', '2026-09-23');
    const sept23 = cells.find((c) => c.dateKey === '2026-09-23')!;
    expect(sept23.dayNum).toBe(23);
  });
});

describe('moveHabit', () => {
  test('moves an item to another position by id', () => {
    const habits = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(moveHabit(habits, 'a', 'c').map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });

  test('is a no-op when dragging onto itself', () => {
    const habits = [{ id: 'a' }, { id: 'b' }];
    expect(moveHabit(habits, 'a', 'a')).toEqual(habits);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- habit-calc`
Expected: FAIL — `./habit-calc` doesn't exist yet.

- [ ] **Step 3: Implement the calc functions**

Create `app/(app)/habits/habit-calc.ts`:
```ts
import type { FreqType } from '@prisma/client';
import { addDays, buildMonthGrid, shortDateLabel } from '@/app/lib/calendar-dates';

export function habitStreak(logs: string[], todayKey: string): number {
  const logged = new Set(logs);
  let count = 0;
  let cursor = logged.has(todayKey) ? todayKey : addDays(todayKey, -1);
  while (logged.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function habitMonthlyPct(
  habit: { freqType: FreqType; timesPerWeek: number | null },
  logs: string[],
  todayKey: string
): number {
  const monthStartKey = `${todayKey.slice(0, 8)}01`;
  const daysElapsed = Number(todayKey.slice(-2));
  const completions = logs.filter((d) => d >= monthStartKey && d <= todayKey).length;
  let goal: number;
  if (habit.freqType === 'DAILY') {
    goal = daysElapsed;
  } else {
    const weeksElapsed = Math.max(1, Math.ceil(daysElapsed / 7));
    goal = weeksElapsed * (habit.timesPerWeek || 1);
  }
  return Math.min(100, Math.round((completions / Math.max(goal, 1)) * 100));
}

export interface HeatCell {
  dateKey: string;
  logged: boolean;
  future: boolean;
  beforeStart: boolean;
}

export function buildHeatCells(
  logs: string[],
  startDate: string,
  todayKey: string,
  weeks: number
): { cells: HeatCell[]; startLabel: string } {
  const logged = new Set(logs);
  const todayDow = new Date(`${todayKey}T00:00:00`).getDay();
  const gridStart = addDays(addDays(todayKey, -todayDow), -(weeks - 1) * 7);
  const cells: HeatCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const dateKey = addDays(gridStart, i);
    cells.push({
      dateKey,
      logged: logged.has(dateKey),
      future: dateKey > todayKey,
      beforeStart: dateKey < startDate,
    });
  }
  return { cells, startLabel: shortDateLabel(gridStart) };
}

export interface HabitMonthCell {
  dateKey: string;
  inMonth: boolean;
  logged: boolean;
  isToday: boolean;
  future: boolean;
  dayNum: number;
}

export function buildHabitMonthCells(logs: string[], monthKey: string, todayKey: string): HabitMonthCell[] {
  const logged = new Set(logs);
  const [year, month] = monthKey.split('-').map(Number);
  return buildMonthGrid(year, month - 1).map((cell) => ({
    dateKey: cell.dateKey,
    inMonth: cell.inMonth,
    logged: logged.has(cell.dateKey),
    isToday: cell.dateKey === todayKey,
    future: cell.dateKey > todayKey,
    dayNum: Number(cell.dateKey.slice(-2)),
  }));
}

export function moveHabit<T extends { id: string }>(habits: T[], draggedId: string, targetId: string): T[] {
  if (draggedId === targetId) return habits;
  const dragged = habits.find((h) => h.id === draggedId);
  if (!dragged) return habits;
  const without = habits.filter((h) => h.id !== draggedId);
  const targetIndex = without.findIndex((h) => h.id === targetId);
  const at = targetIndex === -1 ? without.length : targetIndex + 1;
  const next = [...without];
  next.splice(at, 0, dragged);
  return next;
}
```

Note: inserting AFTER the target (`targetIndex + 1`), not before it — the test above expects dropping `'a'` onto `'c'` to produce `['b', 'c', 'a']` (a lands after c), and Task 8's own drag-reorder test independently expects the same "drop after target" semantics.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- habit-calc`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/habits/habit-calc.ts" "app/(app)/habits/habit-calc.test.ts"
git commit -m "feat: add habit streak/monthly-%/heatmap/month-grid/reorder pure functions"
```

---

## Task 4: Habit dialog (create/edit form)

**Files:**
- Create: `app/(app)/habits/habit-dialog.tsx`
- Create: `app/(app)/habits/habit-dialog.test.tsx`

**Interfaces:**
- Produces: `HabitDialogValues { name: string; freqType: FreqType; timesPerWeek: string; startDate: string }`, `HabitDialog({ open, mode, initialValues, onClose, onSave, onDelete }: HabitDialogProps)`.
- Consumes: `Dialog`, `Input`, `PillToggle`, `Button` (all `@/app/components/ui/*`).
- Consumed by (Task 8): `habits-board.tsx`.

`timesPerWeek` is carried as a `string` in dialog state (mirroring `TaskDialogValues.dueTime`'s string-carrying pattern) so the numeric `<input>` can be empty while typing; the orchestrator parses it to a number before calling the server action.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/habits/habit-dialog.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { HabitDialog, type HabitDialogValues } from './habit-dialog';

const baseValues: HabitDialogValues = { name: '', freqType: 'DAILY', timesPerWeek: '3', startDate: '2026-09-23' };

describe('HabitDialog', () => {
  test('does not render when closed', () => {
    render(<HabitDialog open={false} mode="create" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows "Times per week" only when frequency is Weekly', () => {
    render(<HabitDialog open mode="create" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByLabelText('Times per week')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Weekly' }));
    expect(screen.getByLabelText('Times per week')).toBeInTheDocument();
  });

  test('calls onSave with the current field values on submit', () => {
    const onSave = vi.fn();
    render(<HabitDialog open mode="create" initialValues={baseValues} onClose={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Stretch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    expect(onSave).toHaveBeenCalledWith({ name: 'Stretch', freqType: 'DAILY', timesPerWeek: '3', startDate: '2026-09-23' });
  });

  test('shows Delete only in edit mode, and calls onDelete', () => {
    const onDelete = vi.fn();
    const { rerender } = render(<HabitDialog open mode="create" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} onDelete={onDelete} />);
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    rerender(<HabitDialog open mode="edit" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalled();
  });

  test('resets its fields when a new initialValues object is passed in', () => {
    const { rerender } = render(<HabitDialog open mode="edit" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Changed' } });
    rerender(<HabitDialog open mode="edit" initialValues={{ ...baseValues, name: 'Read' }} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Habit name')).toHaveValue('Read');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- habit-dialog`
Expected: FAIL — `./habit-dialog` doesn't exist yet.

- [ ] **Step 3: Implement the dialog**

Create `app/(app)/habits/habit-dialog.tsx`:
```tsx
'use client';

import { useState } from 'react';
import type { FreqType } from '@prisma/client';
import { Dialog } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { PillToggle } from '@/app/components/ui/pill-toggle';
import { Button } from '@/app/components/ui/button';

export interface HabitDialogValues {
  name: string;
  freqType: FreqType;
  timesPerWeek: string;
  startDate: string;
}

export interface HabitDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: HabitDialogValues;
  onClose: () => void;
  onSave: (values: HabitDialogValues) => void;
  onDelete?: () => void;
}

export function HabitDialog({ open, mode, initialValues, onClose, onSave, onDelete }: HabitDialogProps) {
  const [values, setValues] = useState(initialValues);
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);

  if (initialValues !== prevInitialValues) {
    setPrevInitialValues(initialValues);
    setValues(initialValues);
  }

  return (
    <Dialog open={open} onClose={onClose} title={mode === 'create' ? 'New habit' : 'Edit habit'}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(values);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <Input
          label="Habit name"
          placeholder="e.g. Stretch"
          value={values.name}
          onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))}
          autoFocus
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Frequency</span>
          <PillToggle
            ariaLabel="Frequency"
            value={values.freqType}
            onChange={(freqType) => setValues((v) => ({ ...v, freqType }))}
            options={[
              { value: 'DAILY', label: 'Every day' },
              { value: 'WEEKLY', label: 'Weekly' },
            ]}
          />
        </div>
        {values.freqType === 'WEEKLY' && (
          <Input
            label="Times per week"
            type="number"
            min={1}
            max={7}
            value={values.timesPerWeek}
            onChange={(event) => setValues((v) => ({ ...v, timesPerWeek: event.target.value }))}
          />
        )}
        <Input
          label="Start date"
          type="date"
          value={values.startDate}
          onChange={(event) => setValues((v) => ({ ...v, startDate: event.target.value }))}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          {mode === 'edit' && onDelete ? (
            <Button type="button" variant="outline" onClick={onDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit">Save habit</Button>
        </div>
      </form>
    </Dialog>
  );
}
```

Note: `PillToggle<T extends string>`'s `value`/`onChange` are generic over `T extends string` — passing `values.freqType` (typed `FreqType`, which is a string-literal union `'DAILY' | 'WEEKLY'`) satisfies that constraint directly, no cast needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- habit-dialog`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/habits/habit-dialog.tsx" "app/(app)/habits/habit-dialog.test.tsx"
git commit -m "feat: add HabitDialog create/edit form"
```

---

## Task 5: Habit card (compact list row)

**Files:**
- Create: `app/(app)/habits/habit-card.tsx`
- Create: `app/(app)/habits/habit-card.test.tsx`

**Interfaces:**
- Produces: `HabitCard({ habit, todayKey, heatWeeks, selected, onSelect, onToggleLog, draggable, onDragStart, onDragOver, onDrop }: HabitCardProps)`.
- Consumes: `CheckToggle`, `Icon` (`grip`, `flame`), `HabitDTO` (Task 1), `habitStreak`, `buildHeatCells` (Task 3).
- Consumed by (Task 6): `habit-list.tsx`, which owns no drag state itself and passes `draggable`/`onDragStart`/`onDragOver`/`onDrop` straight through — the exact pass-through shape `TaskCard`/`task-list-column.tsx` already use for the Tasks phase's own drag-reorder.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/habits/habit-card.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { HabitCard } from './habit-card';
import type { HabitDTO } from './queries';

const habit: HabitDTO = {
  id: 'h1',
  name: 'Stretch',
  color: '#c6ff34',
  freqType: 'DAILY',
  timesPerWeek: null,
  startDate: '2026-08-01',
  order: 0,
  logs: ['2026-09-21', '2026-09-22', '2026-09-23'],
};

describe('HabitCard', () => {
  test('renders name and Daily frequency label', () => {
    render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={vi.fn()} onToggleLog={vi.fn()} />);
    expect(screen.getByText('Stretch')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  test('shows a weekly frequency label with the count', () => {
    render(
      <HabitCard
        habit={{ ...habit, freqType: 'WEEKLY', timesPerWeek: 3 }}
        todayKey="2026-09-23"
        heatWeeks={4}
        selected={false}
        onSelect={vi.fn()}
        onToggleLog={vi.fn()}
      />
    );
    expect(screen.getByText('3x / week')).toBeInTheDocument();
  });

  test('shows the streak flame only when streak > 0', () => {
    const { rerender } = render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={vi.fn()} onToggleLog={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    rerender(<HabitCard habit={{ ...habit, logs: [] }} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={vi.fn()} onToggleLog={vi.fn()} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  test('checkbox reflects today logged and calls onToggleLog with today on click, without selecting the card', () => {
    const onToggleLog = vi.fn();
    const onSelect = vi.fn();
    render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={onSelect} onToggleLog={onToggleLog} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Stretch' });
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(checkbox);
    expect(onToggleLog).toHaveBeenCalledWith('h1', '2026-09-23');
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('clicking a past heatmap cell toggles that date', () => {
    const onToggleLog = vi.fn();
    render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={1} selected={false} onSelect={vi.fn()} onToggleLog={onToggleLog} />);
    const cell = screen.getByTitle('2026-09-21');
    fireEvent.click(cell);
    expect(onToggleLog).toHaveBeenCalledWith('h1', '2026-09-21');
  });

  test('clicking the card itself calls onSelect', () => {
    const onSelect = vi.fn();
    render(<HabitCard habit={habit} todayKey="2026-09-23" heatWeeks={4} selected={false} onSelect={onSelect} onToggleLog={vi.fn()} />);
    fireEvent.click(screen.getByText('Stretch'));
    expect(onSelect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- habit-card`
Expected: FAIL — `./habit-card` doesn't exist yet.

- [ ] **Step 3: Implement the card**

Create `app/(app)/habits/habit-card.tsx`:
```tsx
'use client';

import type { DragEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { Icon } from '@/app/components/icons';
import { habitStreak, buildHeatCells } from './habit-calc';
import type { HabitDTO } from './queries';

export interface HabitCardProps {
  habit: HabitDTO;
  todayKey: string;
  heatWeeks: number;
  selected: boolean;
  onSelect: () => void;
  onToggleLog: (habitId: string, dateKey: string) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
}

export function HabitCard({
  habit,
  todayKey,
  heatWeeks,
  selected,
  onSelect,
  onToggleLog,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: HabitCardProps) {
  const streak = habitStreak(habit.logs, todayKey);
  const loggedToday = habit.logs.includes(todayKey);
  const { cells, startLabel } = buildHeatCells(habit.logs, habit.startDate, todayKey, heatWeeks);
  const freqLabel = habit.freqType === 'DAILY' ? 'Daily' : `${habit.timesPerWeek}x / week`;

  return (
    <div
      onClick={onSelect}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-2xl)',
        cursor: 'pointer',
        background: selected ? `color-mix(in srgb, ${habit.color} 8%, var(--surface))` : 'var(--surface)',
        border: `1px solid ${selected ? habit.color : 'var(--border)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="grip" size={15} style={{ color: 'var(--text-faint)', cursor: 'grab' }} />
        <CheckToggle checked={loggedToday} onToggle={() => onToggleLog(habit.id, todayKey)} label={habit.name} accentColor={habit.color} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: habit.color, flex: 'none' }} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-display)',
            fontWeight: 'var(--weight-semibold)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {habit.name}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', flex: 'none' }}>{freqLabel}</span>
        {streak > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-secondary)', flex: 'none' }}>
            <Icon name="flame" size={13} />
            {streak}
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 13px)', gap: 0, justifyContent: 'start', overflow: 'hidden', borderRadius: 'var(--radius-xs)' }}>
        {cells.map((cell) => {
          const inert = cell.future || cell.beforeStart;
          return (
            <div
              key={cell.dateKey}
              title={cell.future ? undefined : cell.dateKey}
              onClick={
                inert
                  ? (event) => event.stopPropagation()
                  : (event) => {
                      event.stopPropagation();
                      onToggleLog(habit.id, cell.dateKey);
                    }
              }
              style={{
                width: 13,
                height: 13,
                background: cell.future ? 'transparent' : cell.logged ? habit.color : 'var(--surface-3)',
                cursor: inert ? 'default' : 'pointer',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>
        <span>{startLabel}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
```

Note: `CheckToggle` already calls `event.stopPropagation()` internally before invoking `onToggle` (confirmed by reading `check-toggle.tsx`), so clicking the checkbox will not also fire the card's own `onClick={onSelect}` — no extra wrapper needed here, matching the test's expectation that `onSelect` is not called when the checkbox is clicked.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- habit-card`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/habits/habit-card.tsx" "app/(app)/habits/habit-card.test.tsx"
git commit -m "feat: add HabitCard compact list row with heatmap"
```

---

## Task 6: Habit list (left pane)

**Files:**
- Create: `app/(app)/habits/habit-list.tsx`
- Create: `app/(app)/habits/habit-list.test.tsx`

**Interfaces:**
- Produces: `HabitList({ habits, selectedHabitId, todayKey, heatWeeks, onSelect, onToggleLog, onDragStart, onDropOnCard }: HabitListProps)`.
- Consumes: `HabitCard` (Task 5), `HabitDTO` (Task 1).
- Consumed by (Task 8): `habits-board.tsx`, which owns `dragHabitId` state itself (matching `matrix-board.tsx` owning `dragTaskId`, not `quadrant-panel.tsx`/`matrix-task-row.tsx`) and passes down only per-card closures.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/habits/habit-list.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { HabitList } from './habit-list';
import type { HabitDTO } from './queries';

function makeHabit(id: string, order: number): HabitDTO {
  return { id, name: `Habit ${id}`, color: '#c6ff34', freqType: 'DAILY', timesPerWeek: null, startDate: '2026-08-01', order, logs: [] };
}

describe('HabitList', () => {
  test('renders one card per habit', () => {
    render(
      <HabitList
        habits={[makeHabit('a', 0), makeHabit('b', 1)]}
        selectedHabitId="a"
        todayKey="2026-09-23"
        heatWeeks={30}
        onSelect={vi.fn()}
        onToggleLog={vi.fn()}
        onDragStart={vi.fn()}
        onDropOnCard={vi.fn()}
      />
    );
    expect(screen.getByText('Habit a')).toBeInTheDocument();
    expect(screen.getByText('Habit b')).toBeInTheDocument();
  });

  test('shows the empty state when there are no habits', () => {
    render(
      <HabitList
        habits={[]}
        selectedHabitId={null}
        todayKey="2026-09-23"
        heatWeeks={30}
        onSelect={vi.fn()}
        onToggleLog={vi.fn()}
        onDragStart={vi.fn()}
        onDropOnCard={vi.fn()}
      />
    );
    expect(screen.getByText('No habits yet — add one to start tracking.')).toBeInTheDocument();
  });

  test('dropping onto a card calls onDropOnCard with that habit id', () => {
    const onDropOnCard = vi.fn();
    render(
      <HabitList
        habits={[makeHabit('a', 0), makeHabit('b', 1)]}
        selectedHabitId="a"
        todayKey="2026-09-23"
        heatWeeks={30}
        onSelect={vi.fn()}
        onToggleLog={vi.fn()}
        onDragStart={vi.fn()}
        onDropOnCard={onDropOnCard}
      />
    );
    fireEvent.drop(screen.getByText('Habit b'));
    expect(onDropOnCard).toHaveBeenCalledWith('b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- habit-list`
Expected: FAIL — `./habit-list` doesn't exist yet.

- [ ] **Step 3: Implement the list**

Create `app/(app)/habits/habit-list.tsx`:
```tsx
'use client';

import type { DragEvent } from 'react';
import { HabitCard } from './habit-card';
import type { HabitDTO } from './queries';

export interface HabitListProps {
  habits: HabitDTO[];
  selectedHabitId: string | null;
  todayKey: string;
  heatWeeks: number;
  onSelect: (habitId: string) => void;
  onToggleLog: (habitId: string, dateKey: string) => void;
  onDragStart: (habitId: string) => void;
  onDropOnCard: (targetId: string) => void;
}

function allowDrop(event: DragEvent) {
  event.preventDefault();
}

export function HabitList({ habits, selectedHabitId, todayKey, heatWeeks, onSelect, onToggleLog, onDragStart, onDropOnCard }: HabitListProps) {
  if (habits.length === 0) {
    return <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 8 }}>No habits yet — add one to start tracking.</p>;
  }

  return (
    <>
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          todayKey={todayKey}
          heatWeeks={heatWeeks}
          selected={habit.id === selectedHabitId}
          onSelect={() => onSelect(habit.id)}
          onToggleLog={onToggleLog}
          draggable
          onDragStart={() => onDragStart(habit.id)}
          onDragOver={allowDrop}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDropOnCard(habit.id);
          }}
        />
      ))}
    </>
  );
}
```

No dimmed-while-dragging visual is included: the design spec's Habits section doesn't call for one (unlike the mockup's own `opacity` tweak), and this project's convention is not to carry an unused prop "for future use" — if a later task needs it, it gets added then with its own test coverage.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- habit-list`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/habits/habit-list.tsx" "app/(app)/habits/habit-list.test.tsx"
git commit -m "feat: add HabitList left pane with empty state"
```

---

## Task 7: Habit detail (right pane)

**Files:**
- Create: `app/(app)/habits/habit-detail.tsx`
- Create: `app/(app)/habits/habit-detail.test.tsx`

**Interfaces:**
- Produces: `HabitDetail({ habit, todayKey, monthKey, isNarrow, onBack, onEdit, onDelete, onToggleLog, onMonthPrev, onMonthNext }: HabitDetailProps)`.
- Consumes: `IconButton`, `Icon` (`left`, `right`, `pencil`, `trash`), `habitStreak`, `habitMonthlyPct`, `buildHabitMonthCells` (Task 3), `monthYearLabel` from `@/app/lib/calendar-dates`.
- Consumed by (Task 8): `habits-board.tsx`.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/habits/habit-detail.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { HabitDetail } from './habit-detail';
import type { HabitDTO } from './queries';

const habit: HabitDTO = {
  id: 'h1',
  name: 'Stretch',
  color: '#c6ff34',
  freqType: 'DAILY',
  timesPerWeek: null,
  startDate: '2026-08-01',
  order: 0,
  logs: ['2026-09-21', '2026-09-22', '2026-09-23'],
};

describe('HabitDetail', () => {
  test('renders name, freq label, and stat tiles', () => {
    render(
      <HabitDetail
        habit={habit}
        todayKey="2026-09-23"
        monthKey="2026-09-01"
        isNarrow={false}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleLog={vi.fn()}
        onMonthPrev={vi.fn()}
        onMonthNext={vi.fn()}
      />
    );
    expect(screen.getByText('Stretch')).toBeInTheDocument();
    expect(screen.getByText('Every day')).toBeInTheDocument();
    // Plain getByText('3') is ambiguous here: the streak (3), the check-ins
    // count (also 3, since this fixture's 3 logs are all consecutive), and a
    // day-of-month cell in the month picker (day 3) would all match "3" — any
    // streak/count value from 1-31 collides with some day cell, so a fixture
    // change can't avoid this; scope the query to the stat tile's own layout
    // instead (the streak value is the "Day streak" label's adjacent sibling).
    expect(screen.getByText('Day streak').previousElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Day streak')).toBeInTheDocument();
    expect(screen.getByText('Check-ins')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  test('shows the back button only when narrow, and calls onBack', () => {
    const onBack = vi.fn();
    const { rerender } = render(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow={false} onBack={onBack} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLog={vi.fn()} onMonthPrev={vi.fn()} onMonthNext={vi.fn()} />
    );
    expect(screen.queryByText('All habits')).not.toBeInTheDocument();
    rerender(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow onBack={onBack} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLog={vi.fn()} onMonthPrev={vi.fn()} onMonthNext={vi.fn()} />
    );
    fireEvent.click(screen.getByText('All habits'));
    expect(onBack).toHaveBeenCalled();
  });

  test('Edit and Delete icon buttons call their handlers', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow={false} onBack={vi.fn()} onEdit={onEdit} onDelete={onDelete} onToggleLog={vi.fn()} onMonthPrev={vi.fn()} onMonthNext={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Edit habit'));
    expect(onEdit).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Delete habit'));
    expect(onDelete).toHaveBeenCalled();
  });

  test('month picker shows the month label and calls prev/next', () => {
    const onMonthPrev = vi.fn();
    const onMonthNext = vi.fn();
    render(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow={false} onBack={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLog={vi.fn()} onMonthPrev={onMonthPrev} onMonthNext={onMonthNext} />
    );
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(onMonthPrev).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(onMonthNext).toHaveBeenCalled();
  });

  test('clicking a non-future day cell toggles that date; future cells are inert', () => {
    const onToggleLog = vi.fn();
    render(
      <HabitDetail habit={habit} todayKey="2026-09-23" monthKey="2026-09-01" isNarrow={false} onBack={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onToggleLog={onToggleLog} onMonthPrev={vi.fn()} onMonthNext={vi.fn()} />
    );
    fireEvent.click(screen.getByTitle('2026-09-10'));
    expect(onToggleLog).toHaveBeenCalledWith('2026-09-10');
    onToggleLog.mockClear();
    fireEvent.click(screen.getByTitle('2026-09-30'));
    expect(onToggleLog).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- habit-detail`
Expected: FAIL — `./habit-detail` doesn't exist yet.

- [ ] **Step 3: Implement the detail panel**

Create `app/(app)/habits/habit-detail.tsx`:
```tsx
'use client';

import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { monthYearLabel } from '@/app/lib/calendar-dates';
import { habitStreak, habitMonthlyPct, buildHabitMonthCells } from './habit-calc';
import type { HabitDTO } from './queries';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface HabitDetailProps {
  habit: HabitDTO;
  todayKey: string;
  monthKey: string;
  isNarrow: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleLog: (dateKey: string) => void;
  onMonthPrev: () => void;
  onMonthNext: () => void;
}

export function HabitDetail({ habit, todayKey, monthKey, isNarrow, onBack, onEdit, onDelete, onToggleLog, onMonthPrev, onMonthNext }: HabitDetailProps) {
  const streak = habitStreak(habit.logs, todayKey);
  const monthlyPct = habitMonthlyPct(habit, habit.logs, todayKey);
  const freqLabel = habit.freqType === 'DAILY' ? 'Every day' : `${habit.timesPerWeek}x / week`;
  const monthCells = buildHabitMonthCells(habit.logs, monthKey, todayKey);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {isNarrow && (
        <button
          type="button"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: '4px 0', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', cursor: 'pointer' }}
        >
          <Icon name="left" size={16} />
          All habits
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: habit.color, flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginTop: 2 }}>{freqLabel}</div>
        </div>
        <IconButton variant="ghost" onClick={onEdit} label="Edit habit">
          <Icon name="pencil" size={16} />
        </IconButton>
        <IconButton variant="ghost" onClick={onDelete} label="Delete habit">
          <Icon name="trash" size={16} />
        </IconButton>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-2)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>{streak}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>Day streak</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-2)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>{habit.logs.length}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>Check-ins</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-2)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)', color: 'var(--accent)' }}>{monthlyPct}%</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>This month</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <IconButton variant="ghost" size="sm" onClick={onMonthPrev} label="Previous month">
            <Icon name="left" size={15} />
          </IconButton>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{monthYearLabel(monthKey)}</span>
          <IconButton variant="ghost" size="sm" onClick={onMonthNext} label="Next month">
            <Icon name="right" size={15} />
          </IconButton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>
              {label}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {monthCells.map((cell) => (
            <div
              key={cell.dateKey}
              title={cell.dateKey}
              onClick={cell.future ? undefined : () => onToggleLog(cell.dateKey)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                borderRadius: 'var(--radius-sm)',
                background: cell.logged ? habit.color : cell.inMonth ? 'var(--surface-2)' : 'transparent',
                color: cell.logged ? 'var(--on-accent)' : cell.isToday ? 'var(--accent)' : cell.inMonth ? 'var(--text-secondary)' : 'var(--text-faint)',
                border: cell.isToday ? '1px solid var(--accent)' : '1px solid transparent',
                opacity: cell.future ? 0.5 : 1,
                cursor: cell.future ? 'default' : 'pointer',
              }}
            >
              {cell.dayNum}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- habit-detail`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/habits/habit-detail.tsx" "app/(app)/habits/habit-detail.test.tsx"
git commit -m "feat: add HabitDetail right pane with stat tiles and month picker"
```

---

## Task 8: Habits board orchestrator

**Files:**
- Create: `app/(app)/habits/habits-board.tsx`
- Create: `app/(app)/habits/habits-board.test.tsx`

**Interfaces:**
- Produces: `HabitsBoard({ initialHabits }: HabitsBoardProps)`.
- Consumes: `HabitList` (Task 6), `HabitDetail` (Task 7), `HabitDialog` (Task 4), `moveHabit` (Task 3), `createHabit`/`updateHabit`/`deleteHabit`/`reorderHabits`/`toggleHabitLog` (Task 2), `Button`, `useMediaQuery` (`@/app/lib/use-media-query`), `todayKey` (`@/app/lib/date-format`), `addMonths` (`@/app/lib/calendar-dates`).
- Consumed by (Task 9): `app/(app)/habits/page.tsx`.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/habits/habits-board.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { HabitsBoard } from './habits-board';
import type { HabitDTO } from './queries';
import * as actions from './actions';

vi.mock('./actions', () => ({
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  reorderHabits: vi.fn(),
  toggleHabitLog: vi.fn(),
}));

function makeHabit(overrides: Partial<HabitDTO> = {}): HabitDTO {
  return {
    id: 'h1',
    name: 'Stretch',
    color: '#c6ff34',
    freqType: 'DAILY',
    timesPerWeek: null,
    startDate: '2026-08-01',
    order: 0,
    logs: [],
    ...overrides,
  };
}

// jsdom has no window.matchMedia; HabitsBoard calls useMediaQuery directly
// (unlike HabitList/HabitDetail, which receive isNarrow as a prop), so this
// file needs the same stub already used identically in matrix-board.test.tsx
// and calendar-board.test.tsx for the same hook/breakpoint.
function stubMatchMedia(matches: boolean) {
  const mockMql = { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mockMql));
}

describe('HabitsBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubMatchMedia(false);
    window.alert = vi.fn();
  });

  test('renders the empty state when there are no habits', () => {
    render(<HabitsBoard initialHabits={[]} />);
    expect(screen.getByText('No habits yet — add one to start tracking.')).toBeInTheDocument();
  });

  test('auto-selects the first habit and shows its detail panel', () => {
    render(<HabitsBoard initialHabits={[makeHabit({ id: 'a', name: 'A' }), makeHabit({ id: 'b', name: 'B' })]} />);
    expect(screen.getAllByText('A')).not.toHaveLength(0);
    // Detail panel renders the stat-tile labels only once a habit is selected.
    expect(screen.getByText('Day streak')).toBeInTheDocument();
  });

  test('opening the New habit dialog and saving calls createHabit and adds it to the list', async () => {
    vi.mocked(actions.createHabit).mockResolvedValue(makeHabit({ id: 'new', name: 'Read', logs: [] }));
    render(<HabitsBoard initialHabits={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'New habit' }));
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Read' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    await waitFor(() => expect(actions.createHabit).toHaveBeenCalled());
    expect(await screen.findAllByText('Read')).not.toHaveLength(0);
  });

  test('editing via the detail panel calls updateHabit and reflects the new name', async () => {
    const habit = makeHabit();
    vi.mocked(actions.updateHabit).mockResolvedValue({ ...habit, name: 'Stretch v2' });
    render(<HabitsBoard initialHabits={[habit]} />);
    fireEvent.click(screen.getByLabelText('Edit habit'));
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Stretch v2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    await waitFor(() => expect(actions.updateHabit).toHaveBeenCalled());
    expect(await screen.findAllByText('Stretch v2')).not.toHaveLength(0);
  });

  test('deleting the selected habit via the detail trash icon removes it and re-selects the next one', async () => {
    vi.mocked(actions.deleteHabit).mockResolvedValue(undefined);
    render(<HabitsBoard initialHabits={[makeHabit({ id: 'a', name: 'A' }), makeHabit({ id: 'b', name: 'B' })]} />);
    fireEvent.click(screen.getByLabelText('Delete habit'));
    await waitFor(() => expect(actions.deleteHabit).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(screen.queryAllByText('A')).toHaveLength(0));
    expect(screen.getAllByText('B').length).toBeGreaterThan(0);
  });

  test('toggling a log optimistically updates, then reverts and alerts on failure', async () => {
    vi.mocked(actions.toggleHabitLog).mockRejectedValue(new Error('boom'));
    render(<HabitsBoard initialHabits={[makeHabit({ logs: [] })]} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Stretch' });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  test('reordering via drag calls reorderHabits with the new order, reverting on failure', async () => {
    vi.mocked(actions.reorderHabits).mockRejectedValue(new Error('boom'));
    render(<HabitsBoard initialHabits={[makeHabit({ id: 'a', name: 'A', order: 0 }), makeHabit({ id: 'b', name: 'B', order: 1 })]} />);
    // Habit 'a' is auto-selected (first habit), so "A" renders twice — once in
    // its HabitList card, once in HabitDetail's header — while "B" (unselected)
    // renders only once. Disambiguate A's card by its draggable ancestor.
    const cardA = screen.getAllByText('A').map((el) => el.closest('div[draggable]')).find(Boolean)!;
    const cardB = screen.getByText('B').closest('div[draggable]')!;
    fireEvent.dragStart(cardA);
    fireEvent.drop(cardB);
    await waitFor(() => expect(actions.reorderHabits).toHaveBeenCalledWith(['b', 'a']));
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- habits-board`
Expected: FAIL — `./habits-board` doesn't exist yet.

- [ ] **Step 3: Implement the orchestrator**

Create `app/(app)/habits/habits-board.tsx`:
```tsx
'use client';

import { useState, useTransition } from 'react';
import { HabitList } from './habit-list';
import { HabitDetail } from './habit-detail';
import { HabitDialog, type HabitDialogValues } from './habit-dialog';
import { moveHabit } from './habit-calc';
import { createHabit, updateHabit, deleteHabit, reorderHabits, toggleHabitLog } from './actions';
import { Button } from '@/app/components/ui/button';
import { useMediaQuery } from '@/app/lib/use-media-query';
import { todayKey as getTodayKey } from '@/app/lib/date-format';
import { addMonths } from '@/app/lib/calendar-dates';
import type { HabitDTO } from './queries';

const HEAT_WEEKS_NARROW = 14;
const HEAT_WEEKS_WIDE = 30;

export interface HabitsBoardProps {
  initialHabits: HabitDTO[];
}

function habitToDialogValues(habit: HabitDTO): HabitDialogValues {
  return {
    name: habit.name,
    freqType: habit.freqType,
    timesPerWeek: String(habit.timesPerWeek ?? 3),
    startDate: habit.startDate,
  };
}

export function HabitsBoard({ initialHabits }: HabitsBoardProps) {
  const [habits, setHabits] = useState(initialHabits);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(initialHabits[0]?.id ?? null);
  const [showDetailOnNarrow, setShowDetailOnNarrow] = useState(false);
  const [habitMonth, setHabitMonth] = useState(() => `${getTodayKey().slice(0, 8)}01`);
  const [dragHabitId, setDragHabitId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ habit: HabitDTO | null; values: HabitDialogValues } | null>(null);
  const isNarrow = useMediaQuery('(max-width: 860px)');
  const [, startTransition] = useTransition();

  const todayKey = getTodayKey();
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) ?? null;
  const showHabitList = !isNarrow || !showDetailOnNarrow;
  const showHabitDetail = !!selectedHabit && (!isNarrow || showDetailOnNarrow);

  function handleSelect(habitId: string) {
    setSelectedHabitId(habitId);
    setShowDetailOnNarrow(true);
  }

  function handleToggleLog(habitId: string, dateKey: string) {
    const prevHabits = habits;
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const has = h.logs.includes(dateKey);
        return { ...h, logs: has ? h.logs.filter((d) => d !== dateKey) : [...h.logs, dateKey] };
      })
    );
    startTransition(async () => {
      try {
        await toggleHabitLog(habitId, dateKey);
      } catch {
        setHabits(prevHabits);
        window.alert('Could not update the habit log. Please try again.');
      }
    });
  }

  function handleDragStart(habitId: string) {
    setDragHabitId(habitId);
  }

  function handleDropOnCard(targetId: string) {
    if (!dragHabitId) return;
    const prevHabits = habits;
    const next = moveHabit(habits, dragHabitId, targetId);
    setHabits(next);
    setDragHabitId(null);
    startTransition(async () => {
      try {
        await reorderHabits(next.map((h) => h.id));
      } catch {
        setHabits(prevHabits);
        window.alert('Could not reorder habits. Please try again.');
      }
    });
  }

  function handleSaveDialog(values: HabitDialogValues) {
    const editingId = dialog?.habit?.id ?? null;
    const timesPerWeek = values.freqType === 'WEEKLY' ? Number(values.timesPerWeek) || 1 : null;
    setDialog(null);
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateHabit({ id: editingId, name: values.name, freqType: values.freqType, timesPerWeek, startDate: values.startDate });
          setHabits((prev) => prev.map((h) => (h.id === editingId ? updated : h)));
        } else {
          const created = await createHabit({ name: values.name, freqType: values.freqType, timesPerWeek, startDate: values.startDate });
          setHabits((prev) => [...prev, created]);
          setSelectedHabitId((prev) => prev ?? created.id);
        }
      } catch {
        window.alert('Could not save the habit. Please try again.');
      }
    });
  }

  function handleDeleteHabit(habitId: string) {
    const prevHabits = habits;
    const remaining = habits.filter((h) => h.id !== habitId);
    setHabits(remaining);
    setDialog(null);
    if (selectedHabitId === habitId) {
      setSelectedHabitId(remaining[0]?.id ?? null);
    }
    startTransition(async () => {
      try {
        await deleteHabit(habitId);
      } catch {
        setHabits(prevHabits);
        window.alert('Could not delete the habit. Please try again.');
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--pw-vh)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 'var(--space-3)', gap: 'var(--space-3)', padding: '0 clamp(16px, 3vw, 32px)', flex: 'none' }}>
        <Button
          onClick={() =>
            setDialog({ habit: null, values: { name: '', freqType: 'DAILY', timesPerWeek: '3', startDate: todayKey } })
          }
        >
          New habit
        </Button>
      </header>
      <div className="pw-habit-split">
        {showHabitList && (
          <div className="pw-habit-left pw-scroll">
            <HabitList
              habits={habits}
              selectedHabitId={selectedHabitId}
              todayKey={todayKey}
              heatWeeks={isNarrow ? HEAT_WEEKS_NARROW : HEAT_WEEKS_WIDE}
              onSelect={handleSelect}
              onToggleLog={handleToggleLog}
              onDragStart={handleDragStart}
              onDropOnCard={handleDropOnCard}
            />
          </div>
        )}
        {showHabitDetail && selectedHabit && (
          <div className="pw-habit-right pw-scroll">
            <HabitDetail
              habit={selectedHabit}
              todayKey={todayKey}
              monthKey={habitMonth}
              isNarrow={isNarrow}
              onBack={() => setShowDetailOnNarrow(false)}
              onEdit={() => setDialog({ habit: selectedHabit, values: habitToDialogValues(selectedHabit) })}
              onDelete={() => handleDeleteHabit(selectedHabit.id)}
              onToggleLog={(dateKey) => handleToggleLog(selectedHabit.id, dateKey)}
              onMonthPrev={() => setHabitMonth((m) => addMonths(m, -1))}
              onMonthNext={() => setHabitMonth((m) => addMonths(m, 1))}
            />
          </div>
        )}
      </div>
      {dialog && (
        <HabitDialog
          open
          mode={dialog.habit ? 'edit' : 'create'}
          initialValues={dialog.values}
          onClose={() => setDialog(null)}
          onSave={handleSaveDialog}
          onDelete={dialog.habit ? () => handleDeleteHabit(dialog.habit!.id) : undefined}
        />
      )}
    </div>
  );
}
```

`HabitList` no longer accepts a `dragHabitId` prop (see Task 6) — drag identity lives only in this orchestrator's own `dragHabitId` state, read inside `handleDropOnCard`; `HabitList`/`HabitCard` only need the per-card `onDragStart`/`onDragOver`/`onDrop` closures, which already close over each card's own id.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- habits-board`
Expected: PASS. Then run `npx eslint "app/(app)/habits"` and confirm no warnings.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/habits/habits-board.tsx" "app/(app)/habits/habits-board.test.tsx"
git commit -m "feat: add HabitsBoard orchestrator"
```

---

## Task 9: Wire into /habits + cleanup

**Files:**
- Modify: `app/(app)/habits/page.tsx`
- Modify: `app/(app)/stub-pages.test.tsx`

**Interfaces:**
- No new exports — `HabitsPage` becomes an async Server Component with no props, matching `CalendarPage`'s shape from the Calendar phase.

- [ ] **Step 1: Replace the stub page**

Replace `app/(app)/habits/page.tsx`:
```tsx
import { getHabits } from './queries';
import { HabitsBoard } from './habits-board';

export default async function HabitsPage() {
  const habits = await getHabits();
  return <HabitsBoard initialHabits={habits} />;
}
```

- [ ] **Step 2: Update the stub-pages test**

In `app/(app)/stub-pages.test.tsx`, remove the `HabitsPage` import and its row from the `pages` table, and update the comment to include Habits:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';
import JournalPage from './journal/page';

// Tasks, Matrix, Calendar, and Habits are no longer stub pages (see
// ./tasks/tasks-board.test.tsx, ./matrix/matrix-board.test.tsx,
// ./calendar/calendar-board.test.tsx, and ./habits/habits-board.test.tsx)
// so all four are intentionally excluded from this table-driven stub-page test.
const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
  { Component: JournalPage, heading: 'Journal' },
];

describe('stub route pages', () => {
  test.each(pages)('$heading page renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Full verification suite**

Run, in order, and confirm each passes cleanly before proceeding to the next:
```bash
npm test
npm run test:integration
npx tsc --noEmit
npx eslint "app/(app)/habits" app/lib
npm run build
```
Expected: all green; the build's route table shows `/habits` as a dynamic (`ƒ`) route.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/habits/page.tsx" "app/(app)/stub-pages.test.tsx"
git commit -m "feat: wire the Habits board into /habits"
```

- [ ] **Step 5: Manual walkthrough (controller, not this implementer)**

Same as every prior phase's final task: a live authenticated walkthrough against a real dev server and real Postgres (login, load `/habits`, create/edit/delete a habit, toggle today's log and a past heatmap/month cell, drag-reorder two cards, verify persistence across a reload) is out of scope for this implementer subagent — the controller performs it after this task is reported done, using real dev credentials, exactly as documented in the Calendar phase's Task 13.

---

## Self-review notes

**1. Spec coverage against design spec §4.5.** Walking through the spec's prose sentence by sentence: "compact list of habit cards (drag to reorder)" → Tasks 5/6/8 (`HabitCard`, `HabitList`, drag state in `HabitsBoard`). "done today checkbox" → Task 5 (`CheckToggle` in `HabitCard`). "name, frequency label, streak flame (if streak > 0)" → Task 5. "GitHub-style heatmap (7 rows × up to 30 columns desktop / 14 mobile, flowing week-by-week)" → Tasks 3 (`buildHeatCells`) + 5 (rendering) + 8 (`HEAT_WEEKS_WIDE`/`HEAT_WEEKS_NARROW` chosen by `isNarrow`). "click any past/today cell to toggle" → Task 5's heatmap `onClick`, guarded by `future || beforeStart`. "detail panel... stat tiles (day streak, total check-ins, this-month %)" → Task 7. "edit/delete" → Task 7's `IconButton`s + Task 4's dialog Delete button, both routed through Task 8's single `handleDeleteHabit`. "month calendar picker where logged days are filled and clickable to toggle" → Tasks 3 (`buildHabitMonthCells`) + 7. "≤900px stacked" → already-existing CSS (no new task needed). "≤860px master-detail... with a back button" → Task 8's `isNarrow`/`showDetailOnNarrow`/`onBack`. "Empty: No habits yet — add one to start tracking." → Task 6, asserted verbatim in its test. Streak/percent logic → Task 3, both formulas transcribed directly from the mockup and unit-tested against hand-computed expected values. Every sentence of §4.5 maps to a task; no gap found.

**2. Placeholder scan.** No "TBD"/"TODO"/"implement later" anywhere in the 9 tasks. Two real defects were found and fixed during this self-review (not by a downstream reviewer): (a) the drafted `HabitList` accepted a `dragHabitId` prop it never read — confirmed unused by an empirical `eslint` run against a scratch file reproducing the exact pattern (`@typescript-eslint/no-unused-vars` fires as a warning, exit code 0, so it would not have failed any task's verification step, but it is still dead code this project's own review bar would flag; removed the prop from `HabitListProps`, its destructuring, and both test call sites in Task 6); (b) Task 8's `habits-board.tsx` was drafted with both `import type { DragEvent } from 'react'` and a `dragHabitId={dragHabitId}` prop-pass into `<HabitList>` that no longer matches `HabitListProps` after fix (a) — the latter would have been a real `tsc --noEmit` failure (an excess JSX prop against the component's props type), not just a lint warning. Both removed; `dragHabitId` state itself is still used correctly inside `handleDragStart`/`handleDropOnCard`, it just never needed to be threaded down as a prop.

**3. Type-consistency check.** `HabitDTO` (Task 1) is the single shape every other task imports from `./queries` — Tasks 2, 3 (via its `freqType`/`timesPerWeek` shape for `habitMonthlyPct`'s parameter), 5, 6, 7, 8 all consume it unchanged, none redefine it. `FreqType` (Prisma enum, `'DAILY' | 'WEEKLY'`) flows unchanged from the schema through `HabitDTO.freqType`, `CreateHabitInput`/`UpdateHabitInput` (Task 2), `HabitDialogValues.freqType` (Task 4), and `PillToggle<FreqType>`'s generic instantiation (Task 4) — no lossy string-literal remapping introduced anywhere, unlike the mockup's own lowercase `'daily'/'weekly'` convention, which this plan deliberately does not carry over. `HeatCell`/`HabitMonthCell` (Task 3) are consumed unchanged by `HabitCard` (Task 5) and `HabitDetail` (Task 7) respectively. `moveHabit`'s generic `<T extends { id: string }>` signature (Task 3) is instantiated with `HabitDTO[]` in Task 8 with no shape mismatch (`HabitDTO` has an `id: string` field). `HabitDialogValues` (Task 4) is produced and consumed identically by Task 8's `habitToDialogValues`/`handleSaveDialog` — field names match exactly (`name`, `freqType`, `timesPerWeek`, `startDate`), and the `timesPerWeek: string` (dialog) → `timesPerWeek: number | null` (server action input) conversion happens in exactly one place (`handleSaveDialog`), not duplicated.

**4. A deliberate deviation from the mockup, stated once here rather than repeated in every task:** the mockup's habit dialog includes an "Objective date" (`endDate`) field with no corresponding schema column; this plan drops it entirely, matching the fact that design spec §4.5's own prose never mentions an objective/end date either — this is a real product-scope narrowing versus the mockup, not an oversight, consistent with the project's established precedent (the Calendar phase similarly declined to replicate the mockup's virtualization scheme where the design spec explicitly called for a simpler approach).

**5. Two genuine bugs found during Task 3's implementation, not caught by this plan's own self-review, corrected in the plan and on the branch:** (a) `moveHabit`'s originally-drafted code inserted the dragged item **before** the target (`splice(targetIndex, 0, dragged)`), but this task's own test (`moveHabit(habits, 'a', 'c')` expecting `['b', 'c', 'a']`) and Task 8's independent drag-reorder test both require inserting **after** the target — fixed to `splice(targetIndex + 1, 0, dragged)`; this is a real bug in the originally-drafted code, not a test error, since dropping a card onto another and having it land *before* rather than after the drop target would be backwards drag-and-drop UX. (b) `buildHeatCells`'s test suite, as originally drafted, asserted the heatmap grid always ends exactly on today (`cells[cells.length-1].dateKey === todayKey`, `anyFuture` always `false`) — this contradicts both the mockup's actual week-aligned `buildHeat` logic (verified by reading it directly) and design spec §4.5's "flowing week-by-week" phrasing: a real GitHub-style heatmap has fixed weekday rows (row 0 is always Sunday), which requires the grid to start on a Sunday and can therefore end a few days *after* today within the current week (graying out the "future" remainder of that week) whenever today isn't a Saturday — a sliding window ending exactly on today would instead shift which weekday occupies row 0 by one every single day, which is not a GitHub-style heatmap at all. Task 3's implementer correctly followed this plan's (buggy) test to the letter and changed `buildHeatCells`'s implementation to a sliding window to make it pass — a reasonable thing for an implementer to do, but the wrong resolution, since the bug was in the test, not the original week-aligned implementation. The controller caught this during Task 3's post-implementation review (the implementer's own deviation note flagged the change, which prompted a hand-verification of the date math against the mockup), reverted `buildHeatCells` to the original week-aligned formula, and corrected the test's assertions to expect week-alignment with trailing future days instead. **Process lesson:** an implementer's "I changed the code to make the test pass" deviation note is exactly the signal to re-derive the test's own correctness against the spec/mockup before accepting it, not just confirm the diff matches whatever the (possibly-wrong) brief said.

**6. A genuine test-fixture collision found during Task 7's implementation, matching a precedent from an earlier phase's own "Today"/"Today" text collision:** Task 7's test fixture logs 3 consecutive days ending today, so `habitStreak` returns 3 and `habit.logs.length` (check-ins) is also 3 — and because the month picker renders every day-of-month number as its own text node, day "3" of September is on the page too, so a plain `screen.getByText('3')` matches three elements. No fixture value could avoid this (any streak/count from 1-31 collides with some day cell), so the fix scopes the query to the stat tile's DOM structure instead (`screen.getByText('Day streak').previousElementSibling`) rather than changing the fixture or the component. Fixed in the plan text above; the implementer correctly stopped to ask rather than silently altering the component to route around it.

**7. A known, accepted asymmetry, carried over faithfully rather than "fixed":** heatmap cells (Task 5) treat both future dates and dates before a habit's `startDate` as non-interactive, while month-picker cells (Task 7) only treat future dates as non-interactive — so a user can, in the month picker only, toggle a log for a date before they say they started the habit. This exact inconsistency exists in the mockup's own `buildHeat`/`buildHabitMonth` functions (verified by reading both directly) and is preserved per this project's established practice (Calendar, Matrix) of replicating mockup behavior precisely instead of silently "improving" on it — a real whole-branch review may still flag it, at which point it is the human's call whether to keep parity with the mockup or diverge, same as any other plan-vs-review conflict.
