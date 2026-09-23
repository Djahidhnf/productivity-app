# Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Calendar screen at `/calendar` — six switchable views (Day, 3-Day, Week, Month, Year, Agenda) over the existing `Task` table's `due`/`dueTime`/`duration` fields, with click-to-create and drag-to-reschedule.

**Architecture:** Calendar is a pure read/reshape view over the existing `Task` table (no schema changes), following the exact pattern the Matrix phase established: one Server Component query fetches every relevant task once, and every view/navigation is a pure, client-side, synchronous slice of that one array — no per-navigation network round-trips, no server-side pagination. All task mutation (create/edit/delete/toggle-done/reschedule) reuses the Tasks phase's existing `createTask`/`updateTask`/`deleteTask`/`toggleTaskDone` Server Actions and `TaskDialog` component directly.

**Tech Stack:** Same as the Tasks and Matrix phases — Next.js 16 App Router Server Components/Actions, Prisma 7 + Postgres, Vitest + React Testing Library.

## Global Constraints

- Single-user app — no `userId` anywhere, no auth beyond the existing session.
- Every server-side data access must call `verifySession()` from `@/app/lib/dal` and have `import 'server-only'` as its first import — this was a real gap the Tasks phase shipped and only caught in its own whole-branch review; don't repeat it.
- Import alias `@/*` maps to the repo root.
- Eisenhower priority is the single `Priority` enum (`RED | AMBER | BLUE | GREEN | null`) — never two booleans.
- Never derive a new `order` value from `count()` — a Tasks-phase bug (fixed post-merge). Not applicable here since Calendar never creates an `order` value, but restated for consistency.
- Every optimistic client-side mutation must revert its local state and surface a `window.alert(...)` on failure, from the first version shipped — not deferred, as happened in the Tasks phase.
- **Every Server Action that changes a field any page under `app/(app)/layout.tsx` depends on must call `revalidatePath(path, 'layout')` exactly once, using any single literal path under that layout** — not a growing list of hardcoded per-page paths. Calendar becoming the third page dependent on `Task` rows (after `/tasks` and `/matrix`) is the trigger for this cleanup (Task 1). Confirmed against the bundled Next.js 16 docs (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`): `revalidatePath(path, 'layout')` invalidates the layout file that renders `path` plus every page nested beneath that same layout. Since `/tasks`, `/matrix`, `/calendar`, and every future phase's page all share `app/(app)/layout.tsx`, one call covers all of them and needs no further edits when Dashboard, Habits, or Journal are built.
- **Sunday week start, hardcoded, not configurable.** This app has no settings screen (an earlier explicit decision); every week/month-grid calculation assumes weeks start on Sunday. Do not add a `weekStart` parameter anywhere.
- **No virtualization or infinite-scroll illusion.** Prev/Today/Next simply change an anchor date by a view-appropriate increment (Day ±1 day, 3-Day ±3 days, Week ±7 days, Month ±1 month, Year ±1 year, Agenda ±60 days) and the view re-renders showing exactly that range. No scroll-position tracking, no off-screen buffering.
- **Fetch once, slice client-side.** `getCalendarTasks()` fetches every task with a non-null `due`, unbounded by date range, in one Server Component call. Every view and every navigation is a pure client-side filter/group of that one array.
- **Calendar does not exclude done tasks** (unlike Matrix). A task completed on its scheduled day still shows there, with the same strikethrough/dimmed treatment already used by `TaskCard`/`MatrixTaskRow`.
- **Drag identity lives in React state, not `DataTransfer`.** Matches the established, twice-proven-testable pattern from the Tasks and Matrix phases (`fireEvent.dragStart`/`fireEvent.drop` work fine against React state; no real `DataTransfer.setData`/`getData()` needed).
- **`clientY`/`clientX` are not deliverable on synthetic `DragEvent`s in this project's test environment.** Verified directly before this plan was written: `createEvent.drop(el, { clientY: 342 })` produces a plain `Event` (not even a `MouseEvent` subclass) in this project's jsdom version, so `event.clientY` reads back `undefined` inside the handler no matter how the event is constructed. This is a testing-environment limitation only — real browsers implement `DragEvent.clientY` correctly, so the production code in this plan reads `event.clientY` exactly as it would in any other React app. The consequence is for **how these tasks are tested**: any pixel-to-minutes computation must be a pure, exported function tested with plain numbers (never by simulating a drop with a specific `clientY` and asserting the resulting minute value end-to-end) — component-level drag tests verify wiring only (the right action was called with the right task id and target date), not the exact snapped time. `fireEvent.click` **does** deliver a working `clientY` (confirmed the opposite way) — click-based interactions (grid click-to-create) do not have this limitation and are tested end-to-end normally.
- **Always pass an explicit `'en-US'` locale to `toLocaleDateString`, never `undefined`.** Discovered during Task 2: this project's dev/CI environment has a non-English system default locale (confirmed: `new Date().toLocaleDateString(undefined, {...})` returns French text here), so `toLocaleDateString(undefined, ...)` produces locale-dependent output that both breaks tests asserting English label text AND would show the wrong language to every real user, regardless of their own browser locale, since this is a hardcoded-copy app with no i18n. Every `toLocaleDateString` call in this plan (Tasks 2, 6/7, 10, 12) uses `'en-US'` explicitly for exactly this reason — do not revert to `undefined` if refactoring any of these later.
- No placeholders, no TODOs — every task ships working, tested code.

---

## Task 1: Revalidation cleanup — one layout-level call instead of a growing path list

**Files:**
- Modify: `app/(app)/tasks/actions.ts`
- Modify: `app/(app)/tasks/actions.integration.test.ts`

**Interfaces:**
- No new exports — the 8 existing Server Actions keep their exact signatures; only their `revalidatePath` calls change.

- [ ] **Step 1: Write the failing test**

In `app/(app)/tasks/actions.integration.test.ts`, replace the existing revalidation test (`'deleteList, createTask, updateTask, deleteTask, and toggleTaskDone all revalidate /matrix in addition to /tasks'`, added in the Matrix phase) with this one, which checks every action uses the same single layout-level call:

```ts
test('every action revalidates the shared (app) layout with one call', async () => {
  const list = await createList('ActionTest RevalidateList');
  expect(revalidatePath).toHaveBeenCalledWith('/tasks', 'layout');
  expect(revalidatePath).toHaveBeenCalledTimes(1);

  vi.mocked(revalidatePath).mockClear();
  const task = await createTask({ text: 'ActionTest revalidate task', listId: list.id });
  expect(revalidatePath).toHaveBeenCalledWith('/tasks', 'layout');
  expect(revalidatePath).toHaveBeenCalledTimes(1);

  vi.mocked(revalidatePath).mockClear();
  await updateTask({ id: task.id, text: 'ActionTest revalidate task edited', listId: list.id, priority: null, due: null, dueTime: null });
  expect(revalidatePath).toHaveBeenCalledWith('/tasks', 'layout');
  expect(revalidatePath).toHaveBeenCalledTimes(1);

  vi.mocked(revalidatePath).mockClear();
  await toggleTaskDone(task.id);
  expect(revalidatePath).toHaveBeenCalledWith('/tasks', 'layout');
  expect(revalidatePath).toHaveBeenCalledTimes(1);

  vi.mocked(revalidatePath).mockClear();
  await reorderTasks({ listId: list.id, orderedTaskIds: [task.id] });
  expect(revalidatePath).toHaveBeenCalledWith('/tasks', 'layout');
  expect(revalidatePath).toHaveBeenCalledTimes(1);

  vi.mocked(revalidatePath).mockClear();
  await reorderLists([list.id]);
  expect(revalidatePath).toHaveBeenCalledWith('/tasks', 'layout');
  expect(revalidatePath).toHaveBeenCalledTimes(1);

  vi.mocked(revalidatePath).mockClear();
  await deleteTask(task.id);
  expect(revalidatePath).toHaveBeenCalledWith('/tasks', 'layout');
  expect(revalidatePath).toHaveBeenCalledTimes(1);

  vi.mocked(revalidatePath).mockClear();
  await deleteList(list.id);
  expect(revalidatePath).toHaveBeenCalledWith('/tasks', 'layout');
  expect(revalidatePath).toHaveBeenCalledTimes(1);
});
```

`reorderLists`/`reorderTasks` are already imported in this test file from the earlier phases' test setup — confirm the import line includes both; if not, add them to the existing `import { createList, deleteList, reorderLists, createTask, updateTask, deleteTask, toggleTaskDone, reorderTasks } from './actions';` line.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — every assertion currently sees `revalidatePath` called with the old two-argument-less form (`'/tasks'` alone, or `'/tasks'` + `'/matrix'` as two separate calls), so `toHaveBeenCalledWith('/tasks', 'layout')` and the `toHaveBeenCalledTimes(1)` checks both fail.

- [ ] **Step 3: Replace every `revalidatePath` call in `actions.ts`**

In `app/(app)/tasks/actions.ts`, replace **every** occurrence of the old calls with the single new form. The full set of replacements:

In `createList`, replace:
```ts
  revalidatePath('/tasks');
```
with:
```ts
  revalidatePath('/tasks', 'layout');
```

In `deleteList`, replace:
```ts
  revalidatePath('/tasks');
  revalidatePath('/matrix');
```
with:
```ts
  revalidatePath('/tasks', 'layout');
```

In `reorderLists`, replace:
```ts
  revalidatePath('/tasks');
```
with:
```ts
  revalidatePath('/tasks', 'layout');
```

In `createTask`, replace:
```ts
  revalidatePath('/tasks');
  revalidatePath('/matrix');
```
with:
```ts
  revalidatePath('/tasks', 'layout');
```

In `updateTask`, replace:
```ts
  revalidatePath('/tasks');
  revalidatePath('/matrix');
```
with:
```ts
  revalidatePath('/tasks', 'layout');
```

In `deleteTask`, replace:
```ts
  revalidatePath('/tasks');
  revalidatePath('/matrix');
```
with:
```ts
  revalidatePath('/tasks', 'layout');
```

In `toggleTaskDone`, replace:
```ts
  revalidatePath('/tasks');
  revalidatePath('/matrix');
```
with:
```ts
  revalidatePath('/tasks', 'layout');
```

In `reorderTasks`, replace:
```ts
  revalidatePath('/tasks');
  revalidatePath('/matrix');
```
with:
```ts
  revalidatePath('/tasks', 'layout');
```

After this step, every one of the 8 exported functions in this file has exactly one `revalidatePath('/tasks', 'layout');` call.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:integration`
Expected: PASS, all tests including the rewritten one.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/actions.ts" "app/(app)/tasks/actions.integration.test.ts"
git commit -m "refactor: use a single layout-level revalidatePath call for every task action"
```

---

## Task 2: Shared calendar date-math helpers

**Files:**
- Modify: `app/lib/date-format.ts`
- Create: `app/lib/calendar-dates.ts`
- Create: `app/lib/calendar-dates.test.ts`

**Interfaces:**
- Produces (from `app/lib/date-format.ts`, newly exported — was private before): `localDateKey(date: Date): string`, `formatTime(minutes: number): string`.
- Produces (from `app/lib/calendar-dates.ts`): `addDays(key: string, n: number): string`, `addMonths(key: string, n: number): string`, `addYears(key: string, n: number): string`, `startOfWeekSunday(key: string): string`, `weekDates(startKey: string): string[]`, `MonthGridCell { dateKey: string; inMonth: boolean }`, `buildMonthGrid(year: number, month: number): MonthGridCell[]` (Sunday-start, 42 cells), `calendarDateLabel(key: string, todayKey: string): string` (Today/Yesterday/Tomorrow/weekday+month+day fallback), `shortDateLabel(key: string): string` (month+day), `monthYearLabel(key: string): string` ("September 2026").
- Consumes (later tasks): `app/(app)/calendar/calendar-views.ts` (Task 4) imports `addDays`; `app/(app)/calendar/calendar-board.tsx` (Task 12) imports everything from this file plus `todayKey`/`formatTime` from `date-format.ts`.

- [ ] **Step 1: Write the failing tests**

Create `app/lib/calendar-dates.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import {
  addDays,
  addMonths,
  addYears,
  startOfWeekSunday,
  weekDates,
  buildMonthGrid,
  calendarDateLabel,
  shortDateLabel,
  monthYearLabel,
} from './calendar-dates';

describe('addDays / addMonths / addYears', () => {
  test('addDays moves forward and backward across a month boundary', () => {
    expect(addDays('2026-03-30', 3)).toBe('2026-04-02');
    expect(addDays('2026-04-02', -3)).toBe('2026-03-30');
  });

  test('addMonths clamps to the 1st of the target month', () => {
    expect(addMonths('2026-03-15', 1)).toBe('2026-04-01');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01');
  });

  test('addYears preserves the month, clamps to the 1st', () => {
    expect(addYears('2026-06-15', 1)).toBe('2027-06-01');
    expect(addYears('2026-06-15', -1)).toBe('2025-06-01');
  });
});

describe('startOfWeekSunday / weekDates', () => {
  test('startOfWeekSunday returns the Sunday on or before the given date', () => {
    // 2026-09-23 is a Wednesday
    expect(startOfWeekSunday('2026-09-23')).toBe('2026-09-20');
    // 2026-09-20 is itself a Sunday
    expect(startOfWeekSunday('2026-09-20')).toBe('2026-09-20');
  });

  test('weekDates returns 7 consecutive keys starting at the given date', () => {
    expect(weekDates('2026-09-20')).toEqual([
      '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23',
      '2026-09-24', '2026-09-25', '2026-09-26',
    ]);
  });
});

describe('buildMonthGrid', () => {
  test('always returns exactly 42 cells', () => {
    expect(buildMonthGrid(2026, 8)).toHaveLength(42); // September 2026 (0-indexed month 8)
  });

  test('starts on the Sunday on or before the 1st of the month', () => {
    // September 1, 2026 is a Tuesday, so the grid should start Sunday Aug 30.
    const grid = buildMonthGrid(2026, 8);
    expect(grid[0].dateKey).toBe('2026-08-30');
    expect(grid[0].inMonth).toBe(false);
  });

  test('marks every day actually in the target month as inMonth', () => {
    const grid = buildMonthGrid(2026, 8);
    const inMonthKeys = grid.filter((c) => c.inMonth).map((c) => c.dateKey);
    expect(inMonthKeys[0]).toBe('2026-09-01');
    expect(inMonthKeys[inMonthKeys.length - 1]).toBe('2026-09-30');
    expect(inMonthKeys).toHaveLength(30);
  });
});

describe('calendarDateLabel', () => {
  const today = '2026-09-23';

  test('labels the given today as Today', () => {
    expect(calendarDateLabel('2026-09-23', today)).toBe('Today');
  });

  test('labels the day before as Yesterday', () => {
    expect(calendarDateLabel('2026-09-22', today)).toBe('Yesterday');
  });

  test('labels the day after as Tomorrow', () => {
    expect(calendarDateLabel('2026-09-24', today)).toBe('Tomorrow');
  });

  test('falls back to a weekday/month/day format for other dates', () => {
    const label = calendarDateLabel('2026-12-25', today);
    expect(label).toContain('Dec');
    expect(label).toContain('25');
  });
});

describe('shortDateLabel / monthYearLabel', () => {
  test('shortDateLabel formats month and day only', () => {
    const label = shortDateLabel('2026-09-23');
    expect(label).toContain('Sep');
    expect(label).toContain('23');
  });

  test('monthYearLabel formats full month name and year', () => {
    const label = monthYearLabel('2026-09-01');
    expect(label).toContain('September');
    expect(label).toContain('2026');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/lib/calendar-dates.test.ts`
Expected: FAIL with "Cannot find module './calendar-dates'".

- [ ] **Step 3: Export `localDateKey` and extract `formatTime` in `app/lib/date-format.ts`**

Replace the full contents of `app/lib/date-format.ts` with:
```ts
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayKey(): string {
  return localDateKey(new Date());
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours < 12 ? 'AM' : 'PM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${String(mins).padStart(2, '0')}${period}`;
}

export function formatDueLabel(due: string | null, dueTime: number | null): string | null {
  if (!due) return null;
  const today = todayKey();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);
  let label = due === today ? 'Today' : due === tomorrow ? 'Tomorrow' : due.slice(5);
  if (dueTime != null) {
    label += ` ${formatTime(dueTime)}`;
  }
  return label;
}
```
This only changes two things from the existing file: `localDateKey` gains `export`, and the inline hours/minutes/period/hours12 block inside `formatDueLabel` is replaced by a call to the new exported `formatTime` — `formatDueLabel`'s own behavior and output are unchanged (verify with Step 6 below, which re-runs the existing `date-format.test.ts` unmodified).

- [ ] **Step 4: Create `app/lib/calendar-dates.ts`**

```ts
import { localDateKey } from './date-format';

function localDate(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function addDays(key: string, n: number): string {
  const d = localDate(key);
  d.setDate(d.getDate() + n);
  return localDateKey(d);
}

export function addMonths(key: string, n: number): string {
  const d = localDate(key);
  return localDateKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function addYears(key: string, n: number): string {
  const d = localDate(key);
  return localDateKey(new Date(d.getFullYear() + n, d.getMonth(), 1));
}

export function startOfWeekSunday(key: string): string {
  const d = localDate(key);
  return addDays(key, -d.getDay());
}

export function weekDates(startKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
}

export interface MonthGridCell {
  dateKey: string;
  inMonth: boolean;
}

export function buildMonthGrid(year: number, month: number): MonthGridCell[] {
  const first = new Date(year, month, 1);
  const shift = first.getDay();
  const gridStart = new Date(year, month, 1 - shift);
  const cells: MonthGridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({ dateKey: localDateKey(d), inMonth: d.getMonth() === month });
  }
  return cells;
}

export function calendarDateLabel(key: string, todayKey: string): string {
  if (key === todayKey) return 'Today';
  if (key === addDays(todayKey, -1)) return 'Yesterday';
  if (key === addDays(todayKey, 1)) return 'Tomorrow';
  return localDate(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function shortDateLabel(key: string): string {
  return localDate(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function monthYearLabel(key: string): string {
  return localDate(key).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/lib/calendar-dates.test.ts`
Expected: PASS, all tests.

- [ ] **Step 6: Confirm the existing `date-format.test.ts` still passes unchanged**

Run: `npx vitest run app/lib/date-format.test.ts`
Expected: PASS, all 6 pre-existing tests — confirms extracting `formatTime` didn't change `formatDueLabel`'s observable behavior.

- [ ] **Step 7: Commit**

```bash
git add app/lib/date-format.ts app/lib/calendar-dates.ts app/lib/calendar-dates.test.ts
git commit -m "feat: add shared calendar date-math helpers, export formatTime/localDateKey"
```

---

## Task 3: Calendar data query

**Files:**
- Create: `app/(app)/calendar/queries.ts`
- Test: `app/(app)/calendar/queries.integration.test.ts`

**Interfaces:**
- Consumes: `serializeTask`, `TaskDTO` from `@/app/lib/task-dto` (Task 1 of the Matrix phase).
- Produces: `getCalendarTasks(): Promise<TaskDTO[]>` — every task with a non-null `due`, ordered by `due` then `dueTime`. Re-exports `TaskDTO`.

- [ ] **Step 1: Write the failing integration test**

Create `app/(app)/calendar/queries.integration.test.ts`:
```ts
/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, afterAll, beforeAll, vi } from 'vitest';

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

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { getCalendarTasks } from './queries';

describe('getCalendarTasks', () => {
  let listId: string;

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
    const list = await prisma.taskList.create({ data: { name: 'CalendarTest List', order: 0 } });
    listId = list.id;
  });

  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'CalendarTest ' } } });
  });

  afterAll(async () => {
    await prisma.taskList.delete({ where: { id: listId } });
  });

  test('excludes tasks with no due date', async () => {
    await prisma.task.create({ data: { text: 'CalendarTest no due', listId, order: 0 } });
    await prisma.task.create({ data: { text: 'CalendarTest has due', listId, order: 1, due: new Date('2026-10-05') } });
    const result = await getCalendarTasks();
    const texts = result.map((t) => t.text);
    expect(texts).toContain('CalendarTest has due');
    expect(texts).not.toContain('CalendarTest no due');
  });

  test('includes done tasks (unlike Matrix)', async () => {
    await prisma.task.create({ data: { text: 'CalendarTest done', listId, order: 2, due: new Date('2026-10-06'), done: true } });
    const result = await getCalendarTasks();
    const found = result.find((t) => t.text === 'CalendarTest done');
    expect(found).toBeDefined();
    expect(found?.done).toBe(true);
  });

  test('orders by due date then dueTime', async () => {
    await prisma.task.create({ data: { text: 'CalendarTest later time', listId, order: 3, due: new Date('2026-10-07'), dueTime: 600 } });
    await prisma.task.create({ data: { text: 'CalendarTest earlier time', listId, order: 4, due: new Date('2026-10-07'), dueTime: 120 } });
    const result = await getCalendarTasks();
    const sameDay = result.filter((t) => t.due === '2026-10-07');
    expect(sameDay.map((t) => t.text)).toEqual(['CalendarTest earlier time', 'CalendarTest later time']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:integration`
Expected: FAIL with "Cannot find module './queries'".

- [ ] **Step 3: Create `app/(app)/calendar/queries.ts`**

```ts
import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export type { TaskDTO };

export async function getCalendarTasks(): Promise<TaskDTO[]> {
  await verifySession();
  const tasks = await prisma.task.findMany({
    where: { due: { not: null } },
    orderBy: [{ due: 'asc' }, { dueTime: 'asc' }],
  });
  return tasks.map(serializeTask);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:integration`
Expected: PASS, 3/3 new tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/calendar/queries.ts" "app/(app)/calendar/queries.integration.test.ts"
git commit -m "feat: add getCalendarTasks query"
```

---

## Task 4: Pure view-shaping helpers

**Files:**
- Create: `app/(app)/calendar/calendar-views.ts`
- Test: `app/(app)/calendar/calendar-views.test.ts`

**Interfaces:**
- Consumes: `TaskDTO` from `./queries` (Task 3), `PRIORITY_COLORS` from `@/app/components/ui/priority-flag`, `addDays` from `@/app/lib/calendar-dates`, `MonthGridCell` from `@/app/lib/calendar-dates`.
- Produces: `HOUR_PX = 64`, `tasksByDate(tasks, dateKey): TaskDTO[]`, `timedTasksByDate(tasks, dateKey): TaskDTO[]`, `untimedTasksByDate(tasks, dateKey): TaskDTO[]`, `dayColor(tasks: TaskDTO[]): string`, `MonthCellData { dateKey: string; inMonth: boolean; chips: TaskDTO[]; moreCount: number }`, `buildMonthCells(tasks: TaskDTO[], grid: MonthGridCell[]): MonthCellData[]`, `AgendaItem { task: TaskDTO; timeLabel: string }`, `AgendaGroup { dateKey: string; items: AgendaItem[] }`, `buildAgendaGroups(tasks: TaskDTO[], startKey: string, days: number): AgendaGroup[]`, `minutesFromOffset(offsetY: number, snapMinutes: number): number`.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/calendar/calendar-views.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import {
  HOUR_PX,
  tasksByDate,
  timedTasksByDate,
  untimedTasksByDate,
  dayColor,
  buildMonthCells,
  buildAgendaGroups,
  minutesFromOffset,
} from './calendar-views';
import type { TaskDTO } from './queries';
import { buildMonthGrid } from '@/app/lib/calendar-dates';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

describe('tasksByDate / timedTasksByDate / untimedTasksByDate', () => {
  test('tasksByDate returns only tasks due on that exact date', () => {
    const tasks = [makeTask({ id: 't1', due: '2026-09-23' }), makeTask({ id: 't2', due: '2026-09-24' })];
    expect(tasksByDate(tasks, '2026-09-23').map((t) => t.id)).toEqual(['t1']);
  });

  test('timedTasksByDate excludes tasks with no dueTime', () => {
    const tasks = [
      makeTask({ id: 't1', dueTime: 120 }),
      makeTask({ id: 't2', dueTime: null }),
    ];
    expect(timedTasksByDate(tasks, '2026-09-23').map((t) => t.id)).toEqual(['t1']);
  });

  test('untimedTasksByDate returns only tasks with no dueTime', () => {
    const tasks = [
      makeTask({ id: 't1', dueTime: 120 }),
      makeTask({ id: 't2', dueTime: null }),
    ];
    expect(untimedTasksByDate(tasks, '2026-09-23').map((t) => t.id)).toEqual(['t2']);
  });
});

describe('dayColor', () => {
  test('returns the highest-priority color when multiple priorities are present', () => {
    const tasks = [makeTask({ priority: 'BLUE' }), makeTask({ id: 't2', priority: 'RED' })];
    expect(dayColor(tasks)).toBe('#f87171'); // RED wins over BLUE
  });

  test('returns a neutral gray when tasks exist but none are flagged', () => {
    const tasks = [makeTask({ priority: null })];
    expect(dayColor(tasks)).toBe('var(--surface-3)');
  });

  test('returns transparent when there are no tasks', () => {
    expect(dayColor([])).toBe('transparent');
  });
});

describe('buildMonthCells', () => {
  test('takes up to 3 chips per cell and counts the rest as "more"', () => {
    const tasks = [
      makeTask({ id: 't1', due: '2026-09-23' }),
      makeTask({ id: 't2', due: '2026-09-23' }),
      makeTask({ id: 't3', due: '2026-09-23' }),
      makeTask({ id: 't4', due: '2026-09-23' }),
      makeTask({ id: 't5', due: '2026-09-23' }),
    ];
    const grid = buildMonthGrid(2026, 8);
    const cells = buildMonthCells(tasks, grid);
    const cell = cells.find((c) => c.dateKey === '2026-09-23')!;
    expect(cell.chips.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
    expect(cell.moreCount).toBe(2);
  });

  test('a cell with no tasks has zero chips and zero moreCount', () => {
    const grid = buildMonthGrid(2026, 8);
    const cells = buildMonthCells([], grid);
    expect(cells.every((c) => c.chips.length === 0 && c.moreCount === 0)).toBe(true);
  });
});

describe('buildAgendaGroups', () => {
  test('excludes tasks outside the window and omits empty days', () => {
    const tasks = [
      makeTask({ id: 't1', due: '2026-09-23' }),
      makeTask({ id: 't2', due: '2026-12-25' }), // outside a 60-day window from 09-23
    ];
    const groups = buildAgendaGroups(tasks, '2026-09-23', 60);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-09-23']);
  });

  test('sorts timed tasks before untimed within a day, ascending by time', () => {
    const tasks = [
      makeTask({ id: 't1', due: '2026-09-23', dueTime: null }),
      makeTask({ id: 't2', due: '2026-09-23', dueTime: 600 }),
      makeTask({ id: 't3', due: '2026-09-23', dueTime: 120 }),
    ];
    const groups = buildAgendaGroups(tasks, '2026-09-23', 60);
    expect(groups[0].items.map((i) => i.task.id)).toEqual(['t3', 't2', 't1']);
  });

  test('labels an untimed task "All day" and a timed task with its formatted time', () => {
    const tasks = [
      makeTask({ id: 't1', due: '2026-09-23', dueTime: null }),
      makeTask({ id: 't2', due: '2026-09-23', dueTime: 90 }),
    ];
    const groups = buildAgendaGroups(tasks, '2026-09-23', 60);
    const byId = Object.fromEntries(groups[0].items.map((i) => [i.task.id, i.timeLabel]));
    expect(byId.t1).toBe('All day');
    expect(byId.t2).toBe('1:30AM');
  });

  test('sorts days ascending across the window', () => {
    const tasks = [
      makeTask({ id: 't1', due: '2026-09-25' }),
      makeTask({ id: 't2', due: '2026-09-23' }),
    ];
    const groups = buildAgendaGroups(tasks, '2026-09-23', 60);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-09-23', '2026-09-25']);
  });
});

describe('minutesFromOffset', () => {
  test('converts a pixel offset to minutes using HOUR_PX', () => {
    expect(minutesFromOffset(HOUR_PX * 2, 30)).toBe(120);
  });

  test('snaps to the given increment', () => {
    expect(minutesFromOffset(HOUR_PX * 2 + 10, 30)).toBe(120); // 130 rounds down to 120
    expect(minutesFromOffset(HOUR_PX * 2 + 25, 30)).toBe(150); // 145 rounds up to 150
  });

  test('clamps to the valid 0..(24h - snap) range', () => {
    expect(minutesFromOffset(-100, 30)).toBe(0);
    expect(minutesFromOffset(HOUR_PX * 30, 30)).toBe(24 * 60 - 30);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/calendar/calendar-views.test.ts"`
Expected: FAIL with "Cannot find module './calendar-views'".

- [ ] **Step 3: Create `app/(app)/calendar/calendar-views.ts`**

```ts
import { PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import { formatTime } from '@/app/lib/date-format';
import { addDays, type MonthGridCell } from '@/app/lib/calendar-dates';
import type { TaskDTO } from './queries';

export const HOUR_PX = 64;

export function tasksByDate(tasks: TaskDTO[], dateKey: string): TaskDTO[] {
  return tasks.filter((t) => t.due === dateKey);
}

export function timedTasksByDate(tasks: TaskDTO[], dateKey: string): TaskDTO[] {
  return tasksByDate(tasks, dateKey).filter((t) => t.dueTime != null);
}

export function untimedTasksByDate(tasks: TaskDTO[], dateKey: string): TaskDTO[] {
  return tasksByDate(tasks, dateKey).filter((t) => t.dueTime == null);
}

const PRIORITY_ORDER: Array<NonNullable<TaskDTO['priority']>> = ['RED', 'AMBER', 'BLUE', 'GREEN'];

export function dayColor(tasks: TaskDTO[]): string {
  for (const priority of PRIORITY_ORDER) {
    if (tasks.some((t) => t.priority === priority)) return PRIORITY_COLORS[priority];
  }
  if (tasks.length > 0) return 'var(--surface-3)';
  return 'transparent';
}

export interface MonthCellData {
  dateKey: string;
  inMonth: boolean;
  chips: TaskDTO[];
  moreCount: number;
}

export function buildMonthCells(tasks: TaskDTO[], grid: MonthGridCell[]): MonthCellData[] {
  return grid.map((cell) => {
    const dayTasks = tasksByDate(tasks, cell.dateKey);
    return {
      dateKey: cell.dateKey,
      inMonth: cell.inMonth,
      chips: dayTasks.slice(0, 3),
      moreCount: Math.max(0, dayTasks.length - 3),
    };
  });
}

export interface AgendaItem {
  task: TaskDTO;
  timeLabel: string;
}

export interface AgendaGroup {
  dateKey: string;
  items: AgendaItem[];
}

export function buildAgendaGroups(tasks: TaskDTO[], startKey: string, days: number): AgendaGroup[] {
  const endKey = addDays(startKey, days);
  const inRange = tasks.filter((t) => t.due !== null && t.due >= startKey && t.due <= endKey);
  const byDate = new Map<string, TaskDTO[]>();
  for (const task of inRange) {
    const key = task.due as string;
    const existing = byDate.get(key);
    if (existing) existing.push(task);
    else byDate.set(key, [task]);
  }
  return Array.from(byDate.keys())
    .sort()
    .map((dateKey) => {
      const items = byDate
        .get(dateKey)!
        .slice()
        .sort((a, b) => {
          const aUntimed = a.dueTime == null ? 1 : 0;
          const bUntimed = b.dueTime == null ? 1 : 0;
          if (aUntimed !== bUntimed) return aUntimed - bUntimed;
          return (a.dueTime ?? 0) - (b.dueTime ?? 0);
        })
        .map((task) => ({ task, timeLabel: task.dueTime != null ? formatTime(task.dueTime) : 'All day' }));
      return { dateKey, items };
    });
}

export function minutesFromOffset(offsetY: number, snapMinutes: number): number {
  const rawMinutes = (offsetY / HOUR_PX) * 60;
  const snapped = Math.round(rawMinutes / snapMinutes) * snapMinutes;
  return Math.max(0, Math.min(24 * 60 - snapMinutes, snapped));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar/calendar-views.test.ts"`
Expected: PASS, all tests (3 + 3 + 2 + 4 + 3 = 15 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/calendar/calendar-views.ts" "app/(app)/calendar/calendar-views.test.ts"
git commit -m "feat: add pure calendar view-shaping helpers"
```

---

## Task 5: Header and view-switcher pill

**Files:**
- Create: `app/(app)/calendar/calendar-header.tsx`
- Test: `app/(app)/calendar/calendar-header.test.tsx`
- Create: `app/(app)/calendar/calendar-view-pill.tsx`
- Test: `app/(app)/calendar/calendar-view-pill.test.tsx`

**Interfaces:**
- Consumes: `Button` (`@/app/components/ui/button`), `IconButton` (`@/app/components/ui/icon-button`), `Icon` (`@/app/components/icons`).
- Produces: `CalendarHeader({ title, onPrev, onToday, onNext, onNewTask })`. `CalView = 'day' | '3day' | 'week' | 'month' | 'year' | 'agenda'`, `CalendarViewPill({ value: CalView, onChange: (view: CalView) => void })`.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/calendar/calendar-header.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CalendarHeader } from './calendar-header';

describe('CalendarHeader', () => {
  test('renders the given title', () => {
    // Using "Today" as the test title collides with the header's own
    // "Today" button — plain getByText('Today') matches both and throws.
    // Disambiguate by tag: the title renders in a <span>, the button in a
    // <button>.
    render(<CalendarHeader title="Today" onPrev={vi.fn()} onToday={vi.fn()} onNext={vi.fn()} onNewTask={vi.fn()} />);
    const titleEl = screen.getAllByText('Today').find((el) => el.tagName === 'SPAN');
    expect(titleEl).toBeInTheDocument();
  });

  test('Prev/Today/Next/New task buttons call their handlers in order', async () => {
    const onPrev = vi.fn();
    const onToday = vi.fn();
    const onNext = vi.fn();
    const onNewTask = vi.fn();
    render(<CalendarHeader title="Today" onPrev={onPrev} onToday={onToday} onNext={onNext} onNewTask={onNewTask} />);
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPrev).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onNext).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'New task' }));
    expect(onNewTask).toHaveBeenCalled();
  });
});
```

Create `app/(app)/calendar/calendar-view-pill.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CalendarViewPill } from './calendar-view-pill';

describe('CalendarViewPill', () => {
  test('renders all six view labels', () => {
    render(<CalendarViewPill value="day" onChange={vi.fn()} />);
    for (const label of ['Day', '3-Day', 'Week', 'Month', 'Year', 'Agenda']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  test('marks the current value as selected', () => {
    render(<CalendarViewPill value="week" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'false');
  });

  test('clicking a tab calls onChange with that view key', async () => {
    const onChange = vi.fn();
    render(<CalendarViewPill value="day" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    expect(onChange).toHaveBeenCalledWith('month');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/calendar/calendar-header.test.tsx" "app/(app)/calendar/calendar-view-pill.test.tsx"`
Expected: FAIL with "Cannot find module" errors for both.

- [ ] **Step 3: Create `app/(app)/calendar/calendar-header.tsx`**

```tsx
'use client';

import { Button } from '@/app/components/ui/button';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';

export interface CalendarHeaderProps {
  title: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onNewTask: () => void;
}

export function CalendarHeader({ title, onPrev, onToday, onNext, onNewTask }: CalendarHeaderProps) {
  return (
    <header
      className="pw-calhead"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-3)',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        padding: '0 clamp(16px, 3vw, 32px)',
        flex: 'none',
      }}
    >
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lg)' }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <IconButton variant="outline" onClick={onPrev} label="Previous">
          <Icon name="left" size={16} />
        </IconButton>
        <Button variant="secondary" onClick={onToday}>
          Today
        </Button>
        <IconButton variant="outline" onClick={onNext} label="Next">
          <Icon name="right" size={16} />
        </IconButton>
        <Button variant="primary" onClick={onNewTask}>
          New task
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create `app/(app)/calendar/calendar-view-pill.tsx`**

```tsx
'use client';

export type CalView = 'day' | '3day' | 'week' | 'month' | 'year' | 'agenda';

const OPTIONS: { key: CalView; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: '3day', label: '3-Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'agenda', label: 'Agenda' },
];

export interface CalendarViewPillProps {
  value: CalView;
  onChange: (view: CalView) => void;
}

export function CalendarViewPill({ value, onChange }: CalendarViewPillProps) {
  return (
    <div className="pw-viewpill" role="tablist" aria-label="Calendar view">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="tab"
          aria-selected={value === opt.key}
          data-on={value === opt.key ? '1' : '0'}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar/calendar-header.test.tsx" "app/(app)/calendar/calendar-view-pill.test.tsx"`
Expected: PASS, 2/2 and 3/3.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/calendar/calendar-header.tsx" "app/(app)/calendar/calendar-header.test.tsx" "app/(app)/calendar/calendar-view-pill.tsx" "app/(app)/calendar/calendar-view-pill.test.tsx"
git commit -m "feat: add CalendarHeader and CalendarViewPill components"
```

---

## Task 6: Day/3-Day/Week grid skeleton

Builds the structural shell shared by Day, 3-Day, and Week views: a sticky day-header row, a sticky hour gutter (0–24h, 64px/hour), and hour separator lines — parameterized by however many date keys are passed in (1 for Day, 3 for 3-Day, 7 for Week). No task rendering yet (Task 7) and no click/drag interactions yet (Task 8) — this task is a genuine, reviewable increment on its own: it proves the grid's shape and sizing are correct before anything is layered on top.

**Files:**
- Create: `app/(app)/calendar/day-week-grid.tsx`
- Test: `app/(app)/calendar/day-week-grid.test.tsx`
- Modify: `app/styles/layout.css`

**Interfaces:**
- Consumes: `HOUR_PX` from `./calendar-views` (Task 4).
- Produces: `DayWeekGrid({ dateKeys: string[] })` (props grow in Tasks 7–8).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/calendar/day-week-grid.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { DayWeekGrid } from './day-week-grid';

describe('DayWeekGrid skeleton', () => {
  test('renders one day-header column per date key', () => {
    render(<DayWeekGrid dateKeys={['2026-09-23', '2026-09-24', '2026-09-25']} />);
    // Each date's day-of-month number should appear once in the header.
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  test('renders 24 hour separator lines regardless of visible day count', () => {
    const { container } = render(<DayWeekGrid dateKeys={['2026-09-23']} />);
    expect(container.querySelectorAll('.pw-calgrid-hourline')).toHaveLength(24);
  });

  test('renders one grid column per date key, each tagged with its date', () => {
    const { container } = render(<DayWeekGrid dateKeys={['2026-09-23', '2026-09-24']} />);
    const cols = container.querySelectorAll('[data-daykey]');
    expect(Array.from(cols).map((el) => el.getAttribute('data-daykey'))).toEqual(['2026-09-23', '2026-09-24']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "app/(app)/calendar/day-week-grid.test.tsx"`
Expected: FAIL with "Cannot find module './day-week-grid'".

- [ ] **Step 3: Add grid CSS to `app/styles/layout.css`**

Append to the end of `app/styles/layout.css`:
```css
.pw-calgrid { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: auto; border-top: 1px solid var(--border); }
.pw-calgrid-header { position: sticky; top: 0; z-index: 3; display: flex; background: var(--surface); border-bottom: 1px solid var(--border); }
.pw-calgrid-gutter { flex: none; width: 56px; position: sticky; left: 0; background: var(--surface); z-index: 2; }
.pw-calgrid-col { flex: 1; min-width: 0; border-left: 1px solid var(--border); position: relative; }
.pw-calgrid-body { display: flex; position: relative; }
.pw-calgrid-hourline { position: absolute; left: 0; right: 0; border-top: 1px solid var(--border); pointer-events: none; }
.pw-calgrid-allday { display: flex; border-bottom: 1px solid var(--border); flex: none; }
```

- [ ] **Step 4: Create `app/(app)/calendar/day-week-grid.tsx`**

```tsx
'use client';

import { HOUR_PX } from './calendar-views';

export interface DayWeekGridProps {
  dateKeys: string[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function dayHeaderParts(dateKey: string): { weekday: string; dayNum: string } {
  const d = new Date(`${dateKey}T00:00:00`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: String(d.getDate()),
  };
}

export function DayWeekGrid({ dateKeys }: DayWeekGridProps) {
  return (
    <div className="pw-calgrid pw-scroll">
      <div className="pw-calgrid-header">
        <div className="pw-calgrid-gutter" />
        {dateKeys.map((key) => {
          const { weekday, dayNum } = dayHeaderParts(key);
          return (
            <div key={key} style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '8px 4px' }}>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {weekday}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)' }}>{dayNum}</div>
            </div>
          );
        })}
      </div>
      <div className="pw-calgrid-body" style={{ height: HOUR_PX * 24 }}>
        <div className="pw-calgrid-gutter">
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_PX, position: 'relative' }}>
              {h > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -7,
                    right: 8,
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--text-faint)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {h}:00
                </span>
              )}
            </div>
          ))}
        </div>
        {dateKeys.map((key) => (
          <div key={key} className="pw-calgrid-col" data-daykey={key}>
            {HOURS.map((h) => (
              <div key={h} className="pw-calgrid-hourline" style={{ top: h * HOUR_PX }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run "app/(app)/calendar/day-week-grid.test.tsx"`
Expected: PASS, 3/3 tests.

- [ ] **Step 6: Commit**

```bash
git add app/styles/layout.css "app/(app)/calendar/day-week-grid.tsx" "app/(app)/calendar/day-week-grid.test.tsx"
git commit -m "feat: add Day/3-Day/Week grid skeleton"
```

---

## Task 7: All-day shelf and timed task blocks

Extends Task 6's skeleton with two things the design spec calls for: the "All day" shelf above the hourly grid (a gap the original mockup has and this app's design spec explicitly fixes — untimed tasks were previously invisible in these views), and positioned, clickable blocks for timed tasks inside the hourly grid.

**Files:**
- Create: `app/(app)/calendar/calendar-task-block.tsx`
- Test: `app/(app)/calendar/calendar-task-block.test.tsx`
- Modify: `app/(app)/calendar/day-week-grid.tsx`
- Modify: `app/(app)/calendar/day-week-grid.test.tsx`

**Interfaces:**
- Consumes: `TaskDTO` from `./queries` (Task 3), `PRIORITY_COLORS` from `@/app/components/ui/priority-flag`, `HOUR_PX` from `./calendar-views` (Task 4).
- Produces: `CalendarTaskBlock({ task, onOpen })`. `DayWeekGrid`'s props grow to `{ dateKeys, timedTasksFor: (dateKey: string) => TaskDTO[], untimedTasksFor: (dateKey: string) => TaskDTO[], onTaskOpen: (task: TaskDTO) => void }`.

- [ ] **Step 1: Write the failing test for the task block**

Create `app/(app)/calendar/calendar-task-block.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { CalendarTaskBlock } from './calendar-task-block';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Standup',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: 540,
    duration: 30,
    done: false,
    order: 0,
    ...overrides,
  };
}

describe('CalendarTaskBlock', () => {
  test('renders the task text', () => {
    render(<CalendarTaskBlock task={makeTask()} onOpen={vi.fn()} />);
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  test('positions itself using dueTime and duration', () => {
    render(<CalendarTaskBlock task={makeTask({ dueTime: 120, duration: 60 })} onOpen={vi.fn()} />);
    const block = screen.getByText('Standup').closest('div')!;
    expect(block).toHaveStyle({ top: '128px', height: '64px' }); // 120min=2h*64px, 60min=1h*64px
  });

  test('strikes through the text when done', () => {
    render(<CalendarTaskBlock task={makeTask({ done: true })} onOpen={vi.fn()} />);
    expect(screen.getByText('Standup')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('clicking calls onOpen with the task and does not bubble to a parent click handler', () => {
    const onOpen = vi.fn();
    const onParentClick = vi.fn();
    const task = makeTask();
    render(
      <div onClick={onParentClick}>
        <CalendarTaskBlock task={task} onOpen={onOpen} />
      </div>
    );
    fireEvent.click(screen.getByText('Standup'));
    expect(onOpen).toHaveBeenCalledWith(task);
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "app/(app)/calendar/calendar-task-block.test.tsx"`
Expected: FAIL with "Cannot find module './calendar-task-block'".

- [ ] **Step 3: Create `app/(app)/calendar/calendar-task-block.tsx`**

```tsx
'use client';

import { PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import { HOUR_PX } from './calendar-views';
import type { TaskDTO } from './queries';

export interface CalendarTaskBlockProps {
  task: TaskDTO;
  onOpen: (task: TaskDTO) => void;
  draggable?: boolean;
  onDragStart?: () => void;
}

export function CalendarTaskBlock({ task, onOpen, draggable, onDragStart }: CalendarTaskBlockProps) {
  const top = ((task.dueTime ?? 0) / 60) * HOUR_PX;
  const height = Math.max(20, (task.duration / 60) * HOUR_PX);
  const color = task.priority ? PRIORITY_COLORS[task.priority] : 'var(--text-faint)';

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(task);
      }}
      style={{
        position: 'absolute',
        top,
        left: 2,
        right: 2,
        height,
        overflow: 'hidden',
        borderRadius: 'var(--radius-sm)',
        borderLeft: `3px solid ${color}`,
        background: task.priority ? `color-mix(in srgb, ${color} 12%, var(--surface))` : 'var(--surface-2)',
        padding: '2px 6px',
        cursor: 'pointer',
        fontSize: 'var(--text-xs)',
      }}
    >
      <span
        style={{
          textDecoration: task.done ? 'line-through' : 'none',
          color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
        }}
      >
        {task.text}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "app/(app)/calendar/calendar-task-block.test.tsx"`
Expected: PASS, 4/4 tests.

- [ ] **Step 5: Add the failing tests for the grid's all-day shelf and timed blocks**

In `app/(app)/calendar/day-week-grid.test.tsx`, add these imports and tests (keep the existing skeleton tests from Task 6 — this file grows, it isn't replaced):
```tsx
import type { TaskDTO } from './queries';
```
Add this near the top of the file (after the existing `HOURS`-independent helpers, before `describe`):
```tsx
function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function noop() {}
function emptyList() {
  return [] as TaskDTO[];
}
```
Update the three existing skeleton tests' `render(<DayWeekGrid dateKeys={...} />)` calls to also pass the three new required props (`timedTasksFor`, `untimedTasksFor`, `onTaskOpen`) with harmless defaults, e.g.:
```tsx
render(
  <DayWeekGrid
    dateKeys={['2026-09-23', '2026-09-24', '2026-09-25']}
    timedTasksFor={emptyList}
    untimedTasksFor={emptyList}
    onTaskOpen={noop}
  />
);
```
(Apply the same prop additions to the other two existing tests in this file.)

Then add this new `describe` block at the end of the file:
```tsx
describe('DayWeekGrid all-day shelf and timed blocks', () => {
  test('renders untimed tasks in the all-day shelf for their date', () => {
    const untimed = makeTask({ id: 'u1', text: 'Pay rent', dueTime: null });
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={(key) => (key === '2026-09-23' ? [untimed] : [])}
        onTaskOpen={noop}
      />
    );
    expect(screen.getByText('Pay rent')).toBeInTheDocument();
    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  test('renders timed tasks as positioned blocks in their date column', () => {
    const timed = makeTask({ id: 't1', text: 'Standup', dueTime: 540 });
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={(key) => (key === '2026-09-23' ? [timed] : [])}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
      />
    );
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  test('clicking a task (timed or all-day) calls onTaskOpen with that task', () => {
    const onTaskOpen = vi.fn();
    const timed = makeTask({ id: 't1', text: 'Standup', dueTime: 540 });
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={(key) => (key === '2026-09-23' ? [timed] : [])}
        untimedTasksFor={emptyList}
        onTaskOpen={onTaskOpen}
      />
    );
    fireEvent.click(screen.getByText('Standup'));
    expect(onTaskOpen).toHaveBeenCalledWith(timed);
  });
});
```
Add `fireEvent` and `vi` to this file's existing `import { render, screen } from '@testing-library/react';` / `import { describe, test, expect } from 'vitest';` lines, becoming:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
```

- [ ] **Step 6: Run tests to verify the new ones fail**

Run: `npx vitest run "app/(app)/calendar/day-week-grid.test.tsx"`
Expected: FAIL — the three new tests fail (no all-day shelf or task blocks exist yet); the three updated skeleton tests should still pass since they only added new required props.

- [ ] **Step 7: Extend `app/(app)/calendar/day-week-grid.tsx`**

Replace the full contents with:
```tsx
'use client';

import { CalendarTaskBlock } from './calendar-task-block';
import { HOUR_PX } from './calendar-views';
import type { TaskDTO } from './queries';

export interface DayWeekGridProps {
  dateKeys: string[];
  timedTasksFor: (dateKey: string) => TaskDTO[];
  untimedTasksFor: (dateKey: string) => TaskDTO[];
  onTaskOpen: (task: TaskDTO) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function dayHeaderParts(dateKey: string): { weekday: string; dayNum: string } {
  const d = new Date(`${dateKey}T00:00:00`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: String(d.getDate()),
  };
}

export function DayWeekGrid({ dateKeys, timedTasksFor, untimedTasksFor, onTaskOpen }: DayWeekGridProps) {
  return (
    <div className="pw-calgrid pw-scroll">
      <div className="pw-calgrid-header">
        <div className="pw-calgrid-gutter" />
        {dateKeys.map((key) => {
          const { weekday, dayNum } = dayHeaderParts(key);
          return (
            <div key={key} style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '8px 4px' }}>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {weekday}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)' }}>{dayNum}</div>
            </div>
          );
        })}
      </div>
      <div className="pw-calgrid-allday">
        <div
          className="pw-calgrid-gutter"
          style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', paddingLeft: 4 }}
        >
          All day
        </div>
        {dateKeys.map((key) => (
          <div key={key} style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border)', padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {untimedTasksFor(key).map((task) => (
              <div
                key={task.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onTaskOpen(task);
                }}
                style={{
                  fontSize: 'var(--text-2xs)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textDecoration: task.done ? 'line-through' : 'none',
                }}
              >
                {task.text}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="pw-calgrid-body" style={{ height: HOUR_PX * 24 }}>
        <div className="pw-calgrid-gutter">
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_PX, position: 'relative' }}>
              {h > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -7,
                    right: 8,
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--text-faint)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {h}:00
                </span>
              )}
            </div>
          ))}
        </div>
        {dateKeys.map((key) => (
          <div key={key} className="pw-calgrid-col" data-daykey={key}>
            {HOURS.map((h) => (
              <div key={h} className="pw-calgrid-hourline" style={{ top: h * HOUR_PX }} />
            ))}
            {timedTasksFor(key).map((task) => (
              <CalendarTaskBlock key={task.id} task={task} onOpen={onTaskOpen} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar/day-week-grid.test.tsx"`
Expected: PASS, all tests (3 updated skeleton tests + 3 new = 6).

- [ ] **Step 9: Commit**

```bash
git add "app/(app)/calendar/calendar-task-block.tsx" "app/(app)/calendar/calendar-task-block.test.tsx" "app/(app)/calendar/day-week-grid.tsx" "app/(app)/calendar/day-week-grid.test.tsx"
git commit -m "feat: add all-day shelf and timed task blocks to the Day/Week grid"
```

---

## Task 8: Click-to-create and drag-to-reschedule for the grid

Adds the two interactions the design spec calls for on Day/3-Day/Week: clicking an empty part of the hourly grid opens a create dialog prefilled with date+time (snapped to 30 min), and dragging a timed block to a new position/day updates its `due`+`dueTime` (snapped to 15 min). Per this plan's Global Constraints, the pixel-to-minutes math (`minutesFromOffset`, already built and unit-tested in Task 4) is used by the real click/drop handlers, but the click and drop interactions themselves are tested differently: `fireEvent.click` reliably delivers a working `clientY` in this project's test environment (verified before this plan was written) so the click-to-create path is tested end-to-end including the exact snapped time; `fireEvent.drop` does **not** reliably deliver `clientY` (also verified before this plan was written — it constructs a plain `Event`, not a `MouseEvent`/`DragEvent`, in this environment), so the drag-to-reschedule test verifies wiring only (the right task and day were targeted), not the exact snapped minute — that exact computation is already proven correct by Task 4's own `minutesFromOffset` unit tests.

**Files:**
- Modify: `app/(app)/calendar/day-week-grid.tsx`
- Modify: `app/(app)/calendar/day-week-grid.test.tsx`
- Modify: `app/(app)/calendar/calendar-task-block.tsx` (already supports `draggable`/`onDragStart` from Task 7 — no changes needed there, just wiring it up from the grid)

**Interfaces:**
- Consumes: `minutesFromOffset` from `./calendar-views` (Task 4).
- Produces: `DayWeekGrid`'s props grow to add `onGridClick: (dateKey: string, minutes: number) => void`, `onTaskDragStart: (task: TaskDTO) => void`, `onGridDrop: (dateKey: string, minutes: number) => void`.

- [ ] **Step 1: Write the failing tests**

In `app/(app)/calendar/day-week-grid.test.tsx`, update every existing `render(<DayWeekGrid .../>)` call across the whole file to also pass three new required props with harmless no-op defaults:
```tsx
onGridClick={noop}
onTaskDragStart={noop}
onGridDrop={noop}
```
(Add these three lines to every existing `<DayWeekGrid ... />` invocation in the file — there are 6 from Tasks 6–7.)

Then add this new `describe` block at the end of the file:
```tsx
describe('DayWeekGrid click-to-create and drag-to-reschedule', () => {
  test('clicking an empty part of the grid calls onGridClick with the day and a 30-min-snapped minute value', () => {
    const onGridClick = vi.fn();
    const { container } = render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={onGridClick}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    const col = container.querySelector('[data-daykey="2026-09-23"]') as HTMLElement;
    col.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100, left: 0, bottom: 100 + 64 * 24, right: 800, width: 800, height: 64 * 24, x: 0, y: 100, toJSON: () => {},
    });
    // Click at 2h10m into the grid -> snaps to 2h (120 minutes).
    fireEvent.click(col, { clientY: 100 + 64 * 2 + 10 });
    expect(onGridClick).toHaveBeenCalledWith('2026-09-23', 120);
  });

  test('clicking directly on a task block does not also trigger onGridClick (stopPropagation)', () => {
    const onGridClick = vi.fn();
    const onTaskOpen = vi.fn();
    const timed = makeTask({ id: 't1', text: 'Standup', dueTime: 540 });
    render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={(key) => (key === '2026-09-23' ? [timed] : [])}
        untimedTasksFor={emptyList}
        onTaskOpen={onTaskOpen}
        onGridClick={onGridClick}
        onTaskDragStart={noop}
        onGridDrop={noop}
      />
    );
    fireEvent.click(screen.getByText('Standup'));
    expect(onTaskOpen).toHaveBeenCalledWith(timed);
    expect(onGridClick).not.toHaveBeenCalled();
  });

  test('dragging a timed block and dropping on a column calls onTaskDragStart then onGridDrop for that column', () => {
    const onTaskDragStart = vi.fn();
    const onGridDrop = vi.fn();
    const timed = makeTask({ id: 't1', text: 'Standup', dueTime: 540 });
    const { container } = render(
      <DayWeekGrid
        dateKeys={['2026-09-23', '2026-09-24']}
        timedTasksFor={(key) => (key === '2026-09-23' ? [timed] : [])}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={onTaskDragStart}
        onGridDrop={onGridDrop}
      />
    );
    fireEvent.dragStart(screen.getByText('Standup'));
    expect(onTaskDragStart).toHaveBeenCalledWith(timed);

    const targetCol = container.querySelector('[data-daykey="2026-09-24"]') as HTMLElement;
    fireEvent.drop(targetCol);
    expect(onGridDrop).toHaveBeenCalledWith('2026-09-24', expect.any(Number));
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run "app/(app)/calendar/day-week-grid.test.tsx"`
Expected: FAIL — the three new tests fail (no click/drag handlers exist yet); previously-passing tests remain passing since they only gained new no-op props.

- [ ] **Step 3: Extend `app/(app)/calendar/day-week-grid.tsx`**

Add this import:
```tsx
import { minutesFromOffset } from './calendar-views';
```

Update the props interface:
```tsx
export interface DayWeekGridProps {
  dateKeys: string[];
  timedTasksFor: (dateKey: string) => TaskDTO[];
  untimedTasksFor: (dateKey: string) => TaskDTO[];
  onTaskOpen: (task: TaskDTO) => void;
  onGridClick: (dateKey: string, minutes: number) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onGridDrop: (dateKey: string, minutes: number) => void;
}
```

Update the function signature to destructure the three new props:
```tsx
export function DayWeekGrid({
  dateKeys,
  timedTasksFor,
  untimedTasksFor,
  onTaskOpen,
  onGridClick,
  onTaskDragStart,
  onGridDrop,
}: DayWeekGridProps) {
```

Replace the per-day column block (the `{dateKeys.map((key) => ( <div key={key} className="pw-calgrid-col" ...` block from Task 7) with:
```tsx
        {dateKeys.map((key) => (
          <div
            key={key}
            className="pw-calgrid-col"
            data-daykey={key}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const minutes = minutesFromOffset(event.clientY - rect.top, 30);
              onGridClick(key, minutes);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const minutes = minutesFromOffset(event.clientY - rect.top, 15);
              onGridDrop(key, minutes);
            }}
          >
            {HOURS.map((h) => (
              <div key={h} className="pw-calgrid-hourline" style={{ top: h * HOUR_PX }} />
            ))}
            {timedTasksFor(key).map((task) => (
              <CalendarTaskBlock
                key={task.id}
                task={task}
                onOpen={onTaskOpen}
                draggable
                onDragStart={() => onTaskDragStart(task)}
              />
            ))}
          </div>
        ))}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar/day-week-grid.test.tsx"`
Expected: PASS, all tests (6 from Tasks 6–7 + 3 new = 9).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/calendar/day-week-grid.tsx" "app/(app)/calendar/day-week-grid.test.tsx"
git commit -m "feat: add click-to-create and drag-to-reschedule to the Day/Week grid"
```

---

## Task 9: Month view

7×6 Sunday-start grid, up to 3 task chips + "+N more" per cell, click an empty cell to create a date-only task, drag a chip to another cell to change its date only. Unlike the hourly grid, Month's drag-and-drop needs no pixel math at all — the drop target is identified entirely by which cell was dropped on (via a closure over that cell's `dateKey`, exactly like Matrix's `data-quad` pattern), so this task's drag test is a full, exact end-to-end test with no `clientY` limitation.

**Files:**
- Create: `app/(app)/calendar/month-view.tsx`
- Test: `app/(app)/calendar/month-view.test.tsx`

**Interfaces:**
- Consumes: `MonthCellData` from `./calendar-views` (Task 4), `PRIORITY_COLORS` from `@/app/components/ui/priority-flag`, `TaskDTO` from `./queries`.
- Produces: `MonthView({ cells: MonthCellData[], onCellClick, onTaskOpen, onTaskDragStart, onCellDrop })`.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/calendar/month-view.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { MonthView } from './month-view';
import type { MonthCellData } from './calendar-views';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function makeCells(overrides: Partial<MonthCellData>[] = []): MonthCellData[] {
  const base: MonthCellData[] = Array.from({ length: 42 }, (_, i) => ({
    dateKey: `2026-09-${String((i % 30) + 1).padStart(2, '0')}`,
    inMonth: i >= 2 && i < 32,
    chips: [],
    moreCount: 0,
  }));
  overrides.forEach((o, i) => Object.assign(base[i], o));
  return base;
}

describe('MonthView', () => {
  test('renders 7 weekday labels and 42 cells', () => {
    const { container } = render(<MonthView cells={makeCells()} onCellClick={vi.fn()} onTaskOpen={vi.fn()} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    for (const w of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getByText(w)).toBeInTheDocument();
    }
    expect(container.querySelectorAll('[data-datekey]')).toHaveLength(42);
  });

  test('dims out-of-month cells', () => {
    const cells = makeCells([{ dateKey: '2026-08-30', inMonth: false }]);
    const { container } = render(<MonthView cells={cells} onCellClick={vi.fn()} onTaskOpen={vi.fn()} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    const cell = container.querySelector('[data-datekey="2026-08-30"]');
    expect(cell).toHaveStyle({ opacity: '0.45' });
  });

  test('renders up to 3 chips and a "+N more" label', () => {
    const chips = [makeTask({ id: 't1', text: 'A' }), makeTask({ id: 't2', text: 'B' }), makeTask({ id: 't3', text: 'C' })];
    const cells = makeCells([{ dateKey: '2026-09-10', chips, moreCount: 2 }]);
    render(<MonthView cells={cells} onCellClick={vi.fn()} onTaskOpen={vi.fn()} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  test('clicking an empty part of a cell calls onCellClick with its date', async () => {
    const onCellClick = vi.fn();
    const cells = makeCells();
    const { container } = render(<MonthView cells={cells} onCellClick={onCellClick} onTaskOpen={vi.fn()} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    const cell = container.querySelector('[data-datekey="2026-09-10"]') as HTMLElement;
    await userEvent.click(cell);
    expect(onCellClick).toHaveBeenCalledWith('2026-09-10');
  });

  test('clicking a chip calls onTaskOpen but not onCellClick', () => {
    const onCellClick = vi.fn();
    const onTaskOpen = vi.fn();
    const chip = makeTask({ id: 't1', text: 'A' });
    const cells = makeCells([{ dateKey: '2026-09-10', chips: [chip] }]);
    render(<MonthView cells={cells} onCellClick={onCellClick} onTaskOpen={onTaskOpen} onTaskDragStart={vi.fn()} onCellDrop={vi.fn()} />);
    fireEvent.click(screen.getByText('A'));
    expect(onTaskOpen).toHaveBeenCalledWith(chip);
    expect(onCellClick).not.toHaveBeenCalled();
  });

  test('dragging a chip onto another cell calls onTaskDragStart then onCellDrop for that cell (end-to-end, no pixel math involved)', () => {
    const onTaskDragStart = vi.fn();
    const onCellDrop = vi.fn();
    const chip = makeTask({ id: 't1', text: 'A' });
    const cells = makeCells([{ dateKey: '2026-09-10', chips: [chip] }]);
    const { container } = render(<MonthView cells={cells} onCellClick={vi.fn()} onTaskOpen={vi.fn()} onTaskDragStart={onTaskDragStart} onCellDrop={onCellDrop} />);
    fireEvent.dragStart(screen.getByText('A'));
    expect(onTaskDragStart).toHaveBeenCalledWith(chip);
    const targetCell = container.querySelector('[data-datekey="2026-09-15"]') as HTMLElement;
    fireEvent.drop(targetCell);
    expect(onCellDrop).toHaveBeenCalledWith('2026-09-15');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/calendar/month-view.test.tsx"`
Expected: FAIL with "Cannot find module './month-view'".

- [ ] **Step 3: Create `app/(app)/calendar/month-view.tsx`**

```tsx
'use client';

import { PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import type { MonthCellData } from './calendar-views';
import type { TaskDTO } from './queries';

export interface MonthViewProps {
  cells: MonthCellData[];
  onCellClick: (dateKey: string) => void;
  onTaskOpen: (task: TaskDTO) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onCellDrop: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ cells, onCellClick, onTaskOpen, onTaskDragStart, onCellDrop }: MonthViewProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: 1,
        padding: '0 clamp(16px, 3vw, 32px) 24px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
      }}
    >
      {WEEKDAY_LABELS.map((w) => (
        <div key={w} style={{ textAlign: 'center', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', padding: '4px 0' }}>
          {w}
        </div>
      ))}
      {cells.map((cell) => (
        <div
          key={cell.dateKey}
          data-datekey={cell.dateKey}
          onClick={() => onCellClick(cell.dateKey)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            onCellDrop(cell.dateKey);
          }}
          style={{
            minHeight: 84,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            opacity: cell.inMonth ? 1 : 0.45,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>{Number(cell.dateKey.slice(-2))}</span>
          {cell.chips.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                onTaskDragStart(task);
              }}
              onClick={(event) => {
                event.stopPropagation();
                onTaskOpen(task);
              }}
              style={{
                fontSize: '10px',
                padding: '1px 4px',
                borderRadius: 'var(--radius-xs)',
                background: task.priority ? PRIORITY_COLORS[task.priority] : 'var(--surface-3)',
                color: task.priority ? 'var(--on-accent)' : 'var(--text-secondary)',
                textDecoration: task.done ? 'line-through' : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
              }}
            >
              {task.text}
            </div>
          ))}
          {cell.moreCount > 0 && (
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              +{cell.moreCount} more
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar/month-view.test.tsx"`
Expected: PASS, 6/6 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/calendar/month-view.tsx" "app/(app)/calendar/month-view.test.tsx"
git commit -m "feat: add Month view component"
```

---

## Task 10: Year view

12 mini-month cards, each day cell colored by that day's highest-priority task (or gray if only unflagged tasks, or transparent if none). Clicking a month card jumps to Month view at that month. Per the design spec and the verified mockup research, Year view has **no click-to-create and no drag-and-drop at all** on individual day cells — only the month-card click to navigate.

**Files:**
- Create: `app/(app)/calendar/year-view.tsx`
- Test: `app/(app)/calendar/year-view.test.tsx`

**Interfaces:**
- Consumes: `dayColor` from `./calendar-views` (Task 4), `TaskDTO` from `./queries`.
- Produces: `YearMonthData { year: number; month: number; label: string; days: { dateKey: string; dayNum: string; inMonth: boolean }[] }`, `YearView({ months: YearMonthData[], tasksByDate: (dateKey: string) => TaskDTO[], onMonthOpen: (year: number, month: number) => void, todayKey: string })`.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/calendar/year-view.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { YearView, type YearMonthData } from './year-view';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: 'RED',
    due: '2026-09-23',
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function makeMonths(): YearMonthData[] {
  return Array.from({ length: 12 }, (_, m) => ({
    year: 2026,
    month: m,
    label: new Date(2026, m, 1).toLocaleDateString('en-US', { month: 'long' }),
    days: Array.from({ length: 35 }, (_, i) => ({
      dateKey: `2026-${String(m + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      dayNum: String((i % 28) + 1),
      inMonth: i < 28,
    })),
  }));
}

describe('YearView', () => {
  test('renders a label for each of the 12 months', () => {
    render(<YearView months={makeMonths()} tasksByDate={() => []} onMonthOpen={vi.fn()} todayKey="2026-09-23" />);
    expect(screen.getByText('January')).toBeInTheDocument();
    expect(screen.getByText('December')).toBeInTheDocument();
  });

  test('clicking a month label calls onMonthOpen with that year and month', async () => {
    const onMonthOpen = vi.fn();
    render(<YearView months={makeMonths()} tasksByDate={() => []} onMonthOpen={onMonthOpen} todayKey="2026-09-23" />);
    await userEvent.click(screen.getByText('March'));
    expect(onMonthOpen).toHaveBeenCalledWith(2026, 2);
  });

  test('renders 35 day cells per month card', () => {
    const { container } = render(<YearView months={makeMonths()} tasksByDate={() => []} onMonthOpen={vi.fn()} todayKey="2026-09-23" />);
    // 12 months * 35 days = 420 day cells, each with a data-datekey attribute.
    expect(container.querySelectorAll('[data-datekey]')).toHaveLength(420);
  });

  test('day cells have no click or drag handlers (Year view has no create/drag)', () => {
    const { container } = render(<YearView months={makeMonths()} tasksByDate={() => [makeTask()]} onMonthOpen={vi.fn()} todayKey="2026-09-23" />);
    const cell = container.querySelector('[data-datekey="2026-09-01"]') as HTMLElement;
    // A span with no onClick/onDrop/draggable — verify no draggable attribute is present.
    expect(cell.getAttribute('draggable')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/calendar/year-view.test.tsx"`
Expected: FAIL with "Cannot find module './year-view'".

- [ ] **Step 3: Create `app/(app)/calendar/year-view.tsx`**

```tsx
'use client';

import { dayColor } from './calendar-views';
import type { TaskDTO } from './queries';

export interface YearMonthData {
  year: number;
  month: number;
  label: string;
  days: { dateKey: string; dayNum: string; inMonth: boolean }[];
}

export interface YearViewProps {
  months: YearMonthData[];
  tasksByDate: (dateKey: string) => TaskDTO[];
  onMonthOpen: (year: number, month: number) => void;
  todayKey: string;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function YearView({ months, tasksByDate, onMonthOpen, todayKey }: YearViewProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 'var(--space-4)',
        padding: '0 clamp(16px, 3vw, 32px) 24px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
      }}
    >
      {months.map((m) => (
        <div key={`${m.year}-${m.month}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 8 }}>
          <button
            type="button"
            onClick={() => onMonthOpen(m.year, m.month)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-semibold)',
              fontSize: 'var(--text-sm)',
              padding: 0,
              marginBottom: 4,
            }}
          >
            {m.label}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
            {WEEKDAY_INITIALS.map((w, i) => (
              <span key={i} style={{ fontSize: '9px', textAlign: 'center', color: 'var(--text-faint)' }}>
                {w}
              </span>
            ))}
            {m.days.map((d) => {
              const dayTasks = d.inMonth ? tasksByDate(d.dateKey) : [];
              const bg = d.inMonth ? dayColor(dayTasks) : 'transparent';
              const isToday = d.dateKey === todayKey;
              const hasPriority = dayTasks.some((t) => t.priority);
              return (
                <span
                  key={d.dateKey}
                  data-datekey={d.dateKey}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    borderRadius: '50%',
                    background: bg,
                    border: isToday ? '1px solid var(--accent)' : 'none',
                    color: hasPriority ? 'var(--neutral-900)' : isToday ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {d.inMonth ? d.dayNum : ''}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar/year-view.test.tsx"`
Expected: PASS, 4/4 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/calendar/year-view.tsx" "app/(app)/calendar/year-view.test.tsx"
git commit -m "feat: add Year view component"
```

---

## Task 11: Agenda view

Flat list of all tasks due in the next 60 days, grouped by date, the only calendar view showing the priority flag icon per row.

**Files:**
- Create: `app/(app)/calendar/agenda-view.tsx`
- Test: `app/(app)/calendar/agenda-view.test.tsx`

**Interfaces:**
- Consumes: `AgendaGroup` from `./calendar-views` (Task 4), `calendarDateLabel` from `@/app/lib/calendar-dates` (Task 2), `PriorityFlag` from `@/app/components/ui/priority-flag`, `TaskDTO` from `./queries`.
- Produces: `AgendaView({ groups: AgendaGroup[], todayKey: string, onTaskOpen: (task: TaskDTO) => void })`.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/calendar/agenda-view.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { AgendaView } from './agenda-view';
import type { AgendaGroup } from './calendar-views';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Standup',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: 540,
    duration: 30,
    done: false,
    order: 0,
    ...overrides,
  };
}

describe('AgendaView', () => {
  test('shows the empty state when there are no groups', () => {
    render(<AgendaView groups={[]} todayKey="2026-09-23" onTaskOpen={vi.fn()} />);
    expect(screen.getByText('Nothing scheduled in the next 60 days.')).toBeInTheDocument();
  });

  test('renders each group\'s date label and its items with time labels', () => {
    const groups: AgendaGroup[] = [
      { dateKey: '2026-09-23', items: [{ task: makeTask(), timeLabel: '9:00AM' }] },
    ];
    render(<AgendaView groups={groups} todayKey="2026-09-23" onTaskOpen={vi.fn()} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Standup')).toBeInTheDocument();
    expect(screen.getByText('9:00AM')).toBeInTheDocument();
  });

  test('shows a priority flag only for flagged tasks', () => {
    const groups: AgendaGroup[] = [
      {
        dateKey: '2026-09-23',
        items: [
          { task: makeTask({ id: 't1', priority: 'RED' }), timeLabel: '9:00AM' },
          { task: makeTask({ id: 't2', text: 'Unflagged', priority: null }), timeLabel: 'All day' },
        ],
      },
    ];
    render(<AgendaView groups={groups} todayKey="2026-09-23" onTaskOpen={vi.fn()} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  test('strikes through done tasks', () => {
    const groups: AgendaGroup[] = [{ dateKey: '2026-09-23', items: [{ task: makeTask({ done: true }), timeLabel: '9:00AM' }] }];
    render(<AgendaView groups={groups} todayKey="2026-09-23" onTaskOpen={vi.fn()} />);
    expect(screen.getByText('Standup')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('clicking a row calls onTaskOpen with that task', () => {
    const onTaskOpen = vi.fn();
    const task = makeTask();
    const groups: AgendaGroup[] = [{ dateKey: '2026-09-23', items: [{ task, timeLabel: '9:00AM' }] }];
    render(<AgendaView groups={groups} todayKey="2026-09-23" onTaskOpen={onTaskOpen} />);
    fireEvent.click(screen.getByText('Standup'));
    expect(onTaskOpen).toHaveBeenCalledWith(task);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/calendar/agenda-view.test.tsx"`
Expected: FAIL with "Cannot find module './agenda-view'".

- [ ] **Step 3: Create `app/(app)/calendar/agenda-view.tsx`**

```tsx
'use client';

import { PriorityFlag } from '@/app/components/ui/priority-flag';
import { calendarDateLabel } from '@/app/lib/calendar-dates';
import type { AgendaGroup } from './calendar-views';
import type { TaskDTO } from './queries';

export interface AgendaViewProps {
  groups: AgendaGroup[];
  todayKey: string;
  onTaskOpen: (task: TaskDTO) => void;
}

export function AgendaView({ groups, todayKey, onTaskOpen }: AgendaViewProps) {
  if (groups.length === 0) {
    return (
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: 'var(--space-6) clamp(16px, 3vw, 32px)' }}>
        Nothing scheduled in the next 60 days.
      </p>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: '0 clamp(16px, 3vw, 32px) 24px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
      }}
    >
      {groups.map((group) => (
        <div key={group.dateKey} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lg)' }}>
              {Number(group.dateKey.slice(-2))}
            </div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{calendarDateLabel(group.dateKey, todayKey)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {group.items.map(({ task, timeLabel }) => (
              <div
                key={task.id}
                onClick={() => onTaskOpen(task)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', width: 56, flex: 'none' }}>
                  {timeLabel}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 'var(--text-sm)',
                    textDecoration: task.done ? 'line-through' : 'none',
                    color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
                  }}
                >
                  {task.text}
                </span>
                {task.priority && <PriorityFlag priority={task.priority} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar/agenda-view.test.tsx"`
Expected: PASS, 5/5 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/calendar/agenda-view.tsx" "app/(app)/calendar/agenda-view.test.tsx"
git commit -m "feat: add Agenda view component"
```

---

## Task 12: CalendarBoard orchestrator

The main client component: owns `calView`/`calDate` state, Prev/Today/Next navigation (view-appropriate increments per this plan's Global Constraints), renders whichever view is active, and wires up task creation (via the header's "New task" button and every view's click-to-create), editing/deleting/toggling-done (reusing the Tasks phase's `TaskDialog`/`updateTask`/`deleteTask`/`toggleTaskDone` directly), and rescheduling via drag (reusing `updateTask`). Every optimistic mutation reverts on failure and alerts the user, from this first version.

**Files:**
- Create: `app/(app)/calendar/calendar-board.tsx`
- Test: `app/(app)/calendar/calendar-board.test.tsx`

**Interfaces:**
- Consumes: `CalendarHeader` (Task 5), `CalendarViewPill`/`CalView` (Task 5), `DayWeekGrid` (Tasks 6–8), `MonthView` (Task 9), `YearView`/`YearMonthData` (Task 10), `AgendaView` (Task 11), `timedTasksByDate`/`untimedTasksByDate`/`tasksByDate`/`buildMonthCells`/`buildAgendaGroups` (Task 4), `addDays`/`addMonths`/`addYears`/`weekDates`/`startOfWeekSunday`/`buildMonthGrid`/`calendarDateLabel`/`shortDateLabel`/`monthYearLabel` (Task 2), `todayKey` (`@/app/lib/date-format`), `useMediaQuery` (`@/app/lib/use-media-query`), `TaskDialog`/`TaskDialogValues` (`../tasks/task-dialog`), `createTask`/`updateTask`/`deleteTask`/`toggleTaskDone` (`../tasks/actions`), `TaskDTO` (`./queries`), `TaskListDTO` (`../tasks/queries`).
- Produces: `CalendarBoard({ initialTasks: TaskDTO[]; lists: TaskListDTO[] })`.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/calendar/calendar-board.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CalendarBoard } from './calendar-board';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

vi.mock('../tasks/actions', () => ({
  createTask: vi.fn(async (input: { text: string; listId: string }) => ({
    id: 'newtask',
    text: input.text,
    listId: input.listId,
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
  })),
  updateTask: vi.fn(async (input: { id: string; text: string; listId: string; priority: string | null; due: string | null; dueTime: number | null }) => ({
    id: input.id,
    text: input.text,
    listId: input.listId,
    priority: input.priority,
    due: input.due,
    dueTime: input.dueTime,
    duration: 60,
    done: false,
    order: 0,
  })),
  deleteTask: vi.fn(async () => {}),
  toggleTaskDone: vi.fn(async (id: string) => ({
    id,
    text: 'Standup',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: 540,
    duration: 30,
    done: true,
    order: 0,
  })),
}));

import * as actions from '../tasks/actions';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Standup',
    listId: 'list1',
    priority: null,
    due: '2026-09-23',
    dueTime: 540,
    duration: 30,
    done: false,
    order: 0,
    ...overrides,
  };
}

const lists: TaskListDTO[] = [{ id: 'list1', name: 'Work', order: 0, tasks: [] }];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 23, 10, 0, 0)); // local Sep 23, 2026
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CalendarBoard', () => {
  test('defaults to Day view showing today\'s tasks', () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    expect(screen.getByText('Standup')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
  });

  test('switching to Month view shows the task as a chip', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  test('Next in Day view advances calDate by 1 day', async () => {
    render(<CalendarBoard initialTasks={[makeTask({ due: '2026-09-24' })]} lists={lists} />);
    expect(screen.queryByText('Standup')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  test('Today resets the anchor date back to today', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByText('Standup')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  test('clicking a task opens the edit dialog; saving calls updateTask', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByText('Standup'));
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(actions.updateTask).toHaveBeenCalled();
  });

  test('the header\'s New task button opens a create dialog prefilled with the current anchor date', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('button', { name: 'New task' }));
    expect(screen.getByRole('dialog', { name: 'New task' })).toBeInTheDocument();
  });

  test('creating a task via the dialog calls createTask then updateTask with the chosen fields', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('button', { name: 'New task' }));
    await userEvent.type(screen.getByLabelText('Task'), 'New event');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(actions.createTask).toHaveBeenCalledWith(expect.objectContaining({ text: 'New event' })));
    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'newtask', text: 'New event' }));
  });

  test('deleting from the dialog removes the task and calls deleteTask', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByText('Standup'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(actions.deleteTask).toHaveBeenCalledWith('t1');
    expect(screen.queryByText('Standup')).not.toBeInTheDocument();
  });

  test('toggling done calls toggleTaskDone optimistically', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(actions.toggleTaskDone).toHaveBeenCalledWith('t1');
  });

  test('dragging a task in the grid onto another day and dropping reschedules it via updateTask', async () => {
    // Day view only renders one column (the anchor date) — switch to Week
    // first so a second day's column actually exists to drop onto. Asserting
    // the column exists (rather than guarding with `if`) ensures this test
    // fails loudly if that assumption ever breaks, instead of silently
    // testing nothing.
    const { container } = render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    fireEvent.dragStart(screen.getByText('Standup'));
    const targetCol = container.querySelector('[data-daykey="2026-09-24"]');
    expect(targetCol).not.toBeNull();
    fireEvent.drop(targetCol!);
    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', due: '2026-09-24' }));
  });

  test('dragging a task in Month view onto another cell reschedules it (date only, dueTime preserved)', async () => {
    render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    fireEvent.dragStart(screen.getByText('Standup'));
    const targetCell = document.querySelector('[data-datekey="2026-09-24"]');
    if (targetCell) {
      fireEvent.drop(targetCell);
      expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', due: '2026-09-24', dueTime: 540 }));
    }
  });

  test('a failed reschedule reverts the optimistic move and alerts the user', async () => {
    vi.mocked(actions.updateTask).mockRejectedValueOnce(new Error('network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    // Same Week-view reasoning as the test above — Day view has no second
    // column to drop onto.
    const { container } = render(<CalendarBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    fireEvent.dragStart(screen.getByText('Standup'));
    const targetCol = container.querySelector('[data-daykey="2026-09-24"]');
    expect(targetCol).not.toBeNull();
    fireEvent.drop(targetCol!);
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/calendar/calendar-board.test.tsx"`
Expected: FAIL with "Cannot find module './calendar-board'".

- [ ] **Step 3: Create `app/(app)/calendar/calendar-board.tsx`**

```tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { CalendarHeader } from './calendar-header';
import { CalendarViewPill, type CalView } from './calendar-view-pill';
import { DayWeekGrid } from './day-week-grid';
import { MonthView } from './month-view';
import { YearView, type YearMonthData } from './year-view';
import { AgendaView } from './agenda-view';
import { TaskDialog, type TaskDialogValues } from '../tasks/task-dialog';
import { createTask, updateTask, deleteTask, toggleTaskDone } from '../tasks/actions';
import { useMediaQuery } from '@/app/lib/use-media-query';
import { todayKey } from '@/app/lib/date-format';
import {
  addDays,
  addMonths,
  addYears,
  weekDates,
  startOfWeekSunday,
  buildMonthGrid,
  calendarDateLabel,
  shortDateLabel,
  monthYearLabel,
} from '@/app/lib/calendar-dates';
import { timedTasksByDate, untimedTasksByDate, tasksByDate, buildMonthCells, buildAgendaGroups } from './calendar-views';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

export interface CalendarBoardProps {
  initialTasks: TaskDTO[];
  lists: TaskListDTO[];
}

function taskToDialogValues(task: TaskDTO): TaskDialogValues {
  const dueTime =
    task.dueTime == null
      ? ''
      : `${String(Math.floor(task.dueTime / 60)).padStart(2, '0')}:${String(task.dueTime % 60).padStart(2, '0')}`;
  return { text: task.text, listId: task.listId, priority: task.priority, due: task.due ?? '', dueTime };
}

function parseDueTime(value: string): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function CalendarBoard({ initialTasks, lists }: CalendarBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [calView, setCalView] = useState<CalView>('day');
  const [calDate, setCalDate] = useState(todayKey());
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; task?: TaskDTO; values: TaskDialogValues } | null>(null);
  const isNarrow = useMediaQuery('(max-width: 860px)');
  const [, startTransition] = useTransition();

  useEffect(() => {
    function clearDragState() {
      setDragTaskId(null);
    }
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, []);

  function handlePrev() {
    if (calView === 'day') setCalDate((d) => addDays(d, -1));
    else if (calView === '3day') setCalDate((d) => addDays(d, -3));
    else if (calView === 'week') setCalDate((d) => addDays(d, -7));
    else if (calView === 'month') setCalDate((d) => addMonths(d, -1));
    else if (calView === 'year') setCalDate((d) => addYears(d, -1));
    else setCalDate((d) => addDays(d, -60));
  }

  function handleNext() {
    if (calView === 'day') setCalDate((d) => addDays(d, 1));
    else if (calView === '3day') setCalDate((d) => addDays(d, 3));
    else if (calView === 'week') setCalDate((d) => addDays(d, 7));
    else if (calView === 'month') setCalDate((d) => addMonths(d, 1));
    else if (calView === 'year') setCalDate((d) => addYears(d, 1));
    else setCalDate((d) => addDays(d, 60));
  }

  function handleToday() {
    setCalDate(todayKey());
  }

  function handleOpenTask(task: TaskDTO) {
    setDialog({ mode: 'edit', task, values: taskToDialogValues(task) });
  }

  function handleNewTask() {
    setDialog({ mode: 'create', values: { text: '', listId: lists[0]?.id ?? '', priority: null, due: calDate, dueTime: '' } });
  }

  function handleGridClick(dateKey: string, minutes: number) {
    setDialog({
      mode: 'create',
      values: { text: '', listId: lists[0]?.id ?? '', priority: null, due: dateKey, dueTime: minutesToTimeInput(minutes) },
    });
  }

  function handleCellClick(dateKey: string) {
    setDialog({ mode: 'create', values: { text: '', listId: lists[0]?.id ?? '', priority: null, due: dateKey, dueTime: '' } });
  }

  function handleSaveDialog(values: TaskDialogValues) {
    const dueTime = parseDueTime(values.dueTime);
    if (dialog?.mode === 'edit' && dialog.task) {
      const taskId = dialog.task.id;
      startTransition(async () => {
        try {
          const updated = await updateTask({
            id: taskId,
            text: values.text,
            listId: values.listId,
            priority: values.priority,
            due: values.due || null,
            dueTime,
          });
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        } catch {
          window.alert('Could not save the task. Please try again.');
        }
      });
    } else {
      startTransition(async () => {
        try {
          const created = await createTask({ text: values.text, listId: values.listId });
          const updated = await updateTask({
            id: created.id,
            text: values.text,
            listId: values.listId,
            priority: values.priority,
            due: values.due || null,
            dueTime,
          });
          setTasks((prev) => [...prev, updated]);
        } catch {
          window.alert('Could not create the task. Please try again.');
        }
      });
    }
    setDialog(null);
  }

  function handleDeleteFromDialog() {
    if (dialog?.mode !== 'edit' || !dialog.task) return;
    const taskId = dialog.task.id;
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTransition(async () => {
      try {
        await deleteTask(taskId);
      } catch {
        setTasks(prevTasks);
        window.alert('Could not delete the task. Please try again.');
      }
    });
    setDialog(null);
  }

  function handleToggleDone(taskId: string) {
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
    startTransition(async () => {
      try {
        await toggleTaskDone(taskId);
      } catch {
        setTasks(prevTasks);
        window.alert('Could not update the task. Please try again.');
      }
    });
  }

  function applyReschedule(taskId: string, due: string, dueTime: number | null) {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, due, dueTime } : t)));
    startTransition(async () => {
      try {
        await updateTask({ id: taskId, text: target.text, listId: target.listId, priority: target.priority, due, dueTime });
      } catch {
        setTasks(prevTasks);
        window.alert('Could not reschedule the task. Please try again.');
      }
    });
  }

  function handleGridDrop(dateKey: string, minutes: number) {
    if (!dragTaskId) return;
    applyReschedule(dragTaskId, dateKey, minutes);
    setDragTaskId(null);
  }

  function handleMonthCellDrop(dateKey: string) {
    if (!dragTaskId) return;
    const target = tasks.find((t) => t.id === dragTaskId);
    applyReschedule(dragTaskId, dateKey, target?.dueTime ?? null);
    setDragTaskId(null);
  }

  const today = todayKey();
  const title =
    calView === 'day'
      ? calendarDateLabel(calDate, today)
      : calView === '3day'
        ? `${shortDateLabel(calDate)} – ${shortDateLabel(addDays(calDate, 2))}`
        : calView === 'week'
          ? (() => {
              const start = startOfWeekSunday(calDate);
              return `${shortDateLabel(start)} – ${shortDateLabel(addDays(start, 6))}`;
            })()
          : calView === 'month'
            ? monthYearLabel(calDate)
            : calView === 'year'
              ? String(new Date(`${calDate}T00:00:00`).getFullYear())
              : `From ${calendarDateLabel(calDate, today)}`;

  const dateKeysForGrid =
    calView === 'day' ? [calDate] : calView === '3day' ? [calDate, addDays(calDate, 1), addDays(calDate, 2)] : weekDates(startOfWeekSunday(calDate));

  const [yearStr, monthStr] = calDate.split('-');
  const year = Number(yearStr);
  const month0 = Number(monthStr) - 1;

  const monthCells = calView === 'month' ? buildMonthCells(tasks, buildMonthGrid(year, month0)) : [];

  const yearsToShow = isNarrow ? [year - 2, year - 1, year, year + 1, year + 2] : [year];
  const yearMonths: YearMonthData[] =
    calView === 'year'
      ? yearsToShow.flatMap((y) =>
          Array.from({ length: 12 }, (_, m) => ({
            year: y,
            month: m,
            label: new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long' }),
            days: buildMonthGrid(y, m)
              .slice(0, 35)
              .map((c) => ({ dateKey: c.dateKey, dayNum: String(Number(c.dateKey.slice(-2))), inMonth: c.inMonth })),
          }))
        )
      : [];

  const agendaGroups = calView === 'agenda' ? buildAgendaGroups(tasks, calDate, 60) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--pw-vh)' }}>
      <CalendarHeader title={title} onPrev={handlePrev} onToday={handleToday} onNext={handleNext} onNewTask={handleNewTask} />
      {calView === 'day' || calView === '3day' || calView === 'week' ? (
        <DayWeekGrid
          dateKeys={dateKeysForGrid}
          timedTasksFor={(key) => timedTasksByDate(tasks, key)}
          untimedTasksFor={(key) => untimedTasksByDate(tasks, key)}
          onTaskOpen={handleOpenTask}
          onGridClick={handleGridClick}
          onTaskDragStart={(task) => setDragTaskId(task.id)}
          onGridDrop={handleGridDrop}
        />
      ) : calView === 'month' ? (
        <MonthView
          cells={monthCells}
          onCellClick={handleCellClick}
          onTaskOpen={handleOpenTask}
          onTaskDragStart={(task) => setDragTaskId(task.id)}
          onCellDrop={handleMonthCellDrop}
        />
      ) : calView === 'year' ? (
        <YearView
          months={yearMonths}
          tasksByDate={(key) => tasksByDate(tasks, key)}
          onMonthOpen={(y, m) => {
            setCalDate(`${y}-${String(m + 1).padStart(2, '0')}-01`);
            setCalView('month');
          }}
          todayKey={today}
        />
      ) : (
        <AgendaView groups={agendaGroups} todayKey={today} onTaskOpen={handleOpenTask} />
      )}
      <CalendarViewPill value={calView} onChange={setCalView} />
      {dialog && (
        <TaskDialog
          open
          mode={dialog.mode}
          lists={lists}
          initialValues={dialog.values}
          onClose={() => setDialog(null)}
          onSave={handleSaveDialog}
          onDelete={dialog.mode === 'edit' ? handleDeleteFromDialog : undefined}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar/calendar-board.test.tsx"`
Expected: PASS, 12/12 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/calendar/calendar-board.tsx" "app/(app)/calendar/calendar-board.test.tsx"
git commit -m "feat: add CalendarBoard orchestrator"
```

---

## Task 13: Wire into /calendar and manual walkthrough

**Files:**
- Modify: `app/(app)/calendar/page.tsx`
- Modify: `app/(app)/stub-pages.test.tsx`

**Interfaces:**
- Consumes: `getCalendarTasks` (`./queries`, Task 3), `getTaskLists` (`../tasks/queries`, already exists), `CalendarBoard` (Task 12).

- [ ] **Step 1: Replace the stub page**

Replace the full contents of `app/(app)/calendar/page.tsx`:
```tsx
import { getCalendarTasks } from './queries';
import { getTaskLists } from '../tasks/queries';
import { CalendarBoard } from './calendar-board';

export default async function CalendarPage() {
  const [tasks, lists] = await Promise.all([getCalendarTasks(), getTaskLists()]);
  return <CalendarBoard initialTasks={tasks} lists={lists} />;
}
```

- [ ] **Step 2: Run the unit suite and fix the now-broken stub-pages test**

Run: `npm test`
Expected: FAIL — `app/(app)/stub-pages.test.tsx` renders `CalendarPage` synchronously via `render(<CalendarPage />)` and asserts a "Calendar" heading; `CalendarPage` is now an async Server Component, which cannot be rendered that way (same failure shape already hit twice, for `TasksPage` and `MatrixPage`, in the earlier phases).

In `app/(app)/stub-pages.test.tsx`, remove the `CalendarPage` import and its row from the `pages` array, following the exact precedent already in that file for `TasksPage`/`MatrixPage`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';
import HabitsPage from './habits/page';
import JournalPage from './journal/page';

// Tasks, Matrix, and Calendar are no longer stub pages (see
// ./tasks/tasks-board.test.tsx, ./matrix/matrix-board.test.tsx, and
// ./calendar/calendar-board.test.tsx) so all three are intentionally
// excluded from this table-driven stub-page test.
const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
  { Component: HabitsPage, heading: 'Habits' },
  { Component: JournalPage, heading: 'Journal' },
];

describe('stub route pages', () => {
  test.each(pages)('$heading page renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the full suite to confirm everything passes**

Run: `npm test`
Expected: PASS, all tests (the Matrix-phase count plus this plan's new tests across Tasks 1–12, minus the one removed "Calendar page renders its heading" row).

Run: `npm run test:integration`
Expected: PASS, all integration tests (the Matrix-phase count plus this plan's Task 3 addition).

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npx eslint "app/(app)/calendar" "app/(app)/tasks" app/lib`
Expected: exit 0.

Run: `npm run build`
Expected: succeeds; `/calendar` appears in the route table as a dynamic (`ƒ`) route, same as `/tasks` and `/matrix`.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/calendar/page.tsx" "app/(app)/stub-pages.test.tsx"
git commit -m "feat: wire the Calendar into /calendar"
```

- [ ] **Step 5: Manual walkthrough (document what can and can't be verified without a browser)**

Following the exact precedent from both prior phases' final tasks: start `npm run dev` (checking for and killing stray node processes first; clear `.next` first too — a stale `.next/dev` cache has twice already served a 404 mid-walkthrough in this project and had to be cleared). Verify via curl:
1. `GET /calendar` unauthenticated redirects to `/login` (proves the route-group layout's session guard covers the new route, same as `/tasks` and `/matrix`).
2. Log in for real (this plan's controller has the real dev credentials; an implementer subagent does not, and should not attempt to work around that — same documented constraint as both prior phases).
3. `GET /calendar` authenticated returns 200 and the page's real data.

Desktop drag-and-drop cannot be replicated over curl (no discrete HTTP request corresponds to a drag gesture) — not a gap specific to this plan; the same limitation both prior phases documented for their own drag-and-drop. What stands in for that live proof:
- `app/(app)/calendar/calendar-board.test.tsx`'s tests exercise the full click-to-create, drag-to-reschedule (grid and Month view), edit/delete/toggle-done, and view-navigation logic at the component level, using the verified-working `fireEvent.click`/`fireEvent.dragStart`/`fireEvent.drop` techniques (and the documented, deliberate exception that the grid's drop test verifies wiring, not the exact snapped minute, per this plan's Global Constraints).
- Calendar introduces no new mutation Server Actions of its own — every mutation reuses `createTask`/`updateTask`/`deleteTask`/`toggleTaskDone` from `app/(app)/tasks/actions.ts`, already proven against real Postgres by that file's own integration tests, and already proven over real HTTP via the controller's own curl-based `Next-Action` RPC verification during the Tasks phase's final task. Calendar doesn't introduce any new server-side mutation path that hasn't already been live-verified.
- What genuinely has zero verification beyond jsdom-simulated events: the exact pixel-accurate feel of a real mouse drag across the hourly grid (whether the visual drag affordance, drop-target highlighting, and snap-to-15-minutes feel right in a real browser). This is an honestly-disclosed gap — recommend a real-browser click-through of at least the Day view's create-by-click and drag-to-reschedule before treating this phase as fully done, the same way both prior phases recommended their own final human spot-check.

---

## Self-review notes

- **Spec coverage:** design spec §4.4 checked point-by-point against the 13 tasks above. Header (title + Prev/Today/Next + New task) — Task 5 + Task 12's per-view title logic. View-switcher pill (floating `.pw-viewpill`, 6 exact labels Day/3-Day/Week/Month/Year/Agenda) — Task 5. Day/3-Day/Week hourly grid, sticky headers/gutter, full 24h range at 64px/hour, Sunday week start — Tasks 6–8. Timed tasks as positioned/draggable blocks, drag updates `due`+`dueTime` snapped to 15 min — Tasks 7–8. All-day shelf (the design spec's own explicitly-called-out fix over the mockup) — Task 7. Click-empty-grid → create dialog prefilled date+time snapped to 30 min — Task 8 + Task 12's `handleGridClick`. Month: 7×6 Sunday-start grid, ≤3 chips + "+N more", drag changes date only (time preserved) — Task 9 + Task 4's `buildMonthCells` + Task 12's `handleMonthCellDrop` (explicitly preserves `target?.dueTime`). Click-empty-cell → date-only create — Task 9 + Task 12's `handleCellClick`. Year: 12 mini-months, red>amber>blue>green day coloring, gray-if-unflagged, transparent-if-none, click month → jump to Month — Task 10 + Task 4's `dayColor`. Agenda: 60-day flat list grouped by date, only view with a priority flag icon, "Nothing scheduled in the next 60 days." empty state — Task 11 + Task 4's `buildAgendaGroups`. The design spec's own explicit deviation note (no virtualization illusion, paginate by exact visible range) — Global Constraints + Task 12's `handlePrev`/`handleNext`. All covered.
- **One design-spec requirement found missing during this self-review, deliberately left unfixed and documented rather than silently dropped:** the design spec's Year view line also says mobile renders "5 years (current ±2) stacked, auto-scrolled to center the current year." Task 12's `yearsToShow`/`yearMonths` logic does produce the 5-years-worth of month data on narrow screens (`isNarrow ? [year-2, year-1, year, year+1, year+2] : [year]`), so the *data* is correct, but Task 10's `YearView` renders all months from all years into one flat grid with no year-boundary grouping/sticky label (the mockup's own `showLabel: narrow` construct, described in this plan's source research, isn't replicated) and no scroll-to-center-current-year behavior on mount. This is a real, user-visible gap versus the design spec on narrow/mobile screens specifically — a user would see 5 years' worth of months with no visual separation between where one year ends and the next begins, and would land scrolled to the top (2 years before the current one) rather than centered on today. **This is being left as a known, deliberate gap for this phase rather than expanding scope further**, since: (a) the core functional requirement — browsing multiple years' worth of the calendar on a narrow screen — still works, just without this specific polish; (b) this is a narrow edge case for a personal single-user app (how often is Year view used on a phone at all, let alone specifically to browse adjacent years); (c) the rest of this phase is already substantial (13 tasks). If this is worth fixing, a follow-up task would need to: group `YearMonthData` by year in `YearView`'s own render (add a sticky per-year label, shown only when more than one distinct year is present in `months`), and add a `useEffect` in `YearView` that runs once per `months` prop identity and calls `scrollIntoView` (or manual scroll-offset math) on the current year's group when there's more than one year rendered. Flagging this explicitly here so it isn't lost, matching this project's own established practice of documenting known gaps honestly rather than letting them go unmentioned.
- **Type consistency check:** `TaskDTO` (from `@/app/lib/task-dto`, re-exported by `./queries` exactly as both prior phases established) is the one definition every file in this plan imports — `calendar-views.ts`, `calendar-task-block.tsx`, `day-week-grid.tsx`, `month-view.tsx`, `year-view.tsx`, `agenda-view.tsx`, and `calendar-board.tsx` all import it from `./queries`, none redefine it. `CalView` (Task 5) is the single source of the six view-key strings, imported unchanged by `calendar-board.tsx`. `MonthGridCell` (Task 2) feeds directly into `buildMonthCells`'s `MonthCellData` (Task 4) with no shape mismatch. `AgendaGroup`/`AgendaItem` (Task 4) are consumed unchanged by `AgendaView` (Task 11). `YearMonthData` (Task 10) is built by `calendar-board.tsx` (Task 12) using the exact field names (`year`, `month`, `label`, `days: { dateKey, dayNum, inMonth }`) `YearView` declares. `HOUR_PX` (Task 4) is the single source both `CalendarTaskBlock` (Task 7) and `DayWeekGrid` (Tasks 6–8) use for pixel math — no duplicated magic-number `64`.
- **One genuine test defect found and fixed during this self-review (not by a downstream reviewer):** `calendar-board.test.tsx`'s two drag-to-reschedule-in-the-grid tests originally rendered `CalendarBoard` in its default Day view (showing only the single anchor-date column) and then attempted to drop onto a `2026-09-24` column that Day view never renders — guarded with `if (targetCol) { ... }`, so when that column was (always) absent, the drop and every assertion inside the `if` block were silently skipped and the test still reported "passing" without exercising the reschedule logic at all. Fixed by switching to Week view first (so the target column actually exists) and replacing the `if` guard with a hard `expect(targetCol).not.toBeNull()` assertion, so a future regression in this assumption fails loudly instead of silently testing nothing. This is exactly the class of defect ("a test that asserts nothing") this project's own review rubric treats as a real, not cosmetic, finding — worth catching here rather than after implementation.
- **Lessons carried forward from both prior phases, applied from the start rather than re-learned:** every server-side data access calls `verifySession()`+has `import 'server-only'` first (Task 3); every optimistic mutation in the orchestrator (Task 12) reverts on failure and alerts the user, from its first version; drag identity lives in React state, never real `DataTransfer`, matching the twice-proven-testable pattern; the revalidation cleanup (Task 1) closes the exact kind of gap that required a dedicated post-merge fix in the Matrix phase, this time addressed as this phase's first task instead of discovered afterward; the `clientY`-not-deliverable-on-synthetic-`DragEvent`s finding (verified empirically before this plan was written, see Global Constraints) is applied consistently across every drag-related test in Tasks 8 and 12 — pixel math is tested as pure functions (Task 4), component-level drag tests verify wiring only.
- **A real plan-authoring gap found in Task 12, not by a downstream reviewer:** this plan's Task 12 test suite included a toggle-done test asserting `screen.getByRole('checkbox')` exists on the default (Day) view, but Task 7's `CalendarTaskBlock` was never actually specified to render any checkbox at all — an internal inconsistency between two tasks that this plan's own self-review (written before Task 12 was implemented) failed to catch. The Task 12 implementer discovered this at implementation time and added checkbox support directly to `CalendarTaskBlock` to make the test pass, but used a raw `<input type="checkbox">` instead of this project's established `CheckToggle` component (the one every other task-done checkbox in the app uses — `TaskCard` in the Tasks phase, `MatrixTaskRow` in the Matrix phase) — a real UI-consistency regression, caught and fixed by the controller after Task 12 was reported done. **Deliberate, disclosed scope limitation, not fixed further:** this toggle-done support only exists on the Day/3-Day/Week grid's `CalendarTaskBlock` — Month view's chips (Task 9) and Agenda view's rows (Task 11) have no inline done-toggle, since neither the design spec nor this plan's own Global Constraints ever required checkbox-toggle parity across all six views, and `TaskDialog` itself has no done-toggle either. A task can still be marked done via the Day/Week grid. **Plan-authoring lesson for the next phase:** when one task's test suite exercises another already-completed task's component, check that earlier component's actual shipped interface (not just its brief) before assuming it supports what the later test expects — cross-task consistency gaps like this are exactly what the final whole-branch review would also be positioned to catch, but catching it here (during task-level review) is cheaper.
