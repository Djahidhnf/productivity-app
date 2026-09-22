# Eisenhower Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Eisenhower Matrix screen at `/matrix` — a 2×2 quadrant grid (Red/Amber/Blue/Green) plus an Unflagged panel, showing every non-done `Task` across all lists, with desktop drag-and-drop and mobile long-press drag-and-drop to set a task's `priority`, and a responsive tab switcher on narrow screens.

**Architecture:** Matrix is a pure read/regroup view over the existing `Task` table (no schema changes). A flat `TaskDTO[]` (all non-done tasks) is fetched server-side and grouped into 5 buckets by a pure function at render time. Desktop drag-and-drop reuses the exact `dragTaskId` + `window`-level `dragend`-cleanup pattern already reviewed and shipped in the Tasks phase; mobile drag reuses the same drop logic via a parallel touch-based long-press state machine. Task editing/deleting/toggling-done all reuse the Tasks phase's existing `updateTask`/`deleteTask`/`toggleTaskDone` Server Actions and `TaskDialog` component directly — Matrix adds no new mutation actions.

**Tech Stack:** Same as the Tasks phase — Next.js 16 App Router Server Components/Actions, Prisma 7 + Postgres, Vitest + React Testing Library.

## Global Constraints

- Single-user app — no `userId` anywhere, no auth beyond the existing session.
- **Every server-side data access — not just every Server Action — must call `verifySession()` from `@/app/lib/dal` and have `import 'server-only'` as its first import.** (Corrected wording from the Tasks-phase plan: that plan said "every Server Action," which let `getTaskLists()` — a plain read, not an action — ship with no auth check. The whole-branch review caught it and it was fixed before merge. This plan applies the corrected rule from the start.)
- Import alias `@/*` maps to the repo root.
- Design tokens/colors/radii come from the already-wired CSS custom properties and the already-copied `.pw-matrix`/`.pw-matrix-left`/`.pw-matrix-right`/`.pw-quadgrid`/`.pw-scroll` classes in `app/styles/layout.css` (copied during the Foundation phase, confirmed present, responsive breakpoints at 900px and 860px already defined there) — reuse them, don't reinvent this layout's CSS.
- Eisenhower quadrant is the single `Priority` enum (`RED | AMBER | BLUE | GREEN | null`) already on `Task` — never two booleans.
- Never derive a new `order` value from `count()` — a Tasks-phase bug (fixed post-merge) proved this collides after any earlier delete leaves a gap. This plan doesn't create new `order` values at all (Matrix never reorders anything), but the rule is restated here so it isn't reinvented incorrectly in a later phase.
- Every optimistic client-side mutation must revert its local state and surface a `window.alert(...)` on failure, from the first version shipped — not deferred to a later review, as happened in the Tasks phase.
- Don't assume a drag/touch gesture is untestable under jsdom before checking. The Tasks-phase plan wrongly assumed HTML5 `DragEvent`/`DataTransfer` made drag-and-drop untestable (it doesn't, since this app's drag state lives in React, not the native DataTransfer object) and shipped an untested bug as a result. This plan's touch/drag tasks include verified-working test techniques for `fireEvent.touchStart/touchMove/touchEnd`, direct assignment of `document.elementFromPoint` (not `vi.spyOn` — this jsdom version doesn't define the property, so there's nothing to spy on), and `vi.stubGlobal('matchMedia', ...)` — all three were spiked and confirmed working in this exact project before this plan was written.
- **Mobile touch drag-and-drop IS in scope for this phase** (unlike the Tasks phase, which explicitly deferred it as a separable feature) — this matches the design spec's Matrix section and rollout plan, both of which call for "desktop DnD + mobile long-press DnD" as one deliverable.
- Done tasks are excluded from the entire Matrix view (flagged or not) — `getMatrixTasks()` filters `done: false` at the query level, so a task can never appear in Matrix already-done.
- Reuse existing primitives rather than reinventing them: `PRIORITY_COLORS`/`PriorityKey` (`app/components/ui/priority-flag.tsx`), `CheckToggle` (`app/components/ui/check-toggle.tsx`), `PillToggle` (`app/components/ui/pill-toggle.tsx`), `TaskDialog` (`app/(app)/tasks/task-dialog.tsx`), and the Tasks phase's `updateTask`/`deleteTask`/`toggleTaskDone` Server Actions (`app/(app)/tasks/actions.ts`) — Matrix adds no parallel versions of any of these.
- No placeholders, no TODOs — every task ships working, tested code. (Task 7 intentionally ships desktop-only drag-and-drop with inert no-op touch handler props; this is a genuine, complete, reviewable increment — not a placeholder — because Task 8's full spec, including exact code, is already written below, and Task 7's own tests only claim desktop behavior works.)

---

## Task 1: Extract shared task-DTO and due-label helpers (refactor; fixes a known UTC bug)

The Tasks-phase whole-branch review flagged (as deferred Minor findings) that `serializeTask`/`toDateKey` are duplicated between `app/(app)/tasks/queries.ts` and `app/(app)/tasks/actions.ts`, and that `task-card.tsx`'s `formatDueLabel` computes "today"/"tomorrow" using `toISOString().slice(0,10)`, which is UTC-based and wrong near midnight for non-UTC users. Both were deferred with the explicit note "before the Calendar phase, which will want the same thing" and "before three more phases copy it." Matrix is that next consumer — this task extracts both into shared modules now, fixing the UTC bug as part of the move (a one-line change, verified safe against the existing test suite in this task's own steps).

**Files:**
- Create: `app/lib/task-dto.ts`
- Create: `app/lib/date-format.ts`
- Create: `app/lib/date-format.test.ts`
- Modify: `app/(app)/tasks/queries.ts`
- Modify: `app/(app)/tasks/actions.ts`
- Modify: `app/(app)/tasks/task-card.tsx`

**Interfaces:**
- Produces: `TaskDTO` (moved, unchanged shape), `toDateKey(date: Date | null): string | null` (moved, unchanged), `serializeTask(task): TaskDTO` (moved, unchanged) — all from `app/lib/task-dto.ts`. `todayKey(): string` and `formatDueLabel(due: string | null, dueTime: number | null): string | null` (moved from `task-card.tsx`, behavior fixed to use local calendar dates instead of UTC) — from `app/lib/date-format.ts`.
- Consumes (later tasks): `app/(app)/matrix/queries.ts` (Task 3) imports `serializeTask`/`TaskDTO` from `@/app/lib/task-dto`. `app/(app)/matrix/matrix-task-row.tsx` (Task 5) imports `formatDueLabel` from `@/app/lib/date-format`.

- [ ] **Step 1: Write the failing test for the new date-format module**

Create `app/lib/date-format.test.ts`:
```ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { todayKey, formatDueLabel } from './date-format';

describe('todayKey / formatDueLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0)); // local: March 15, 2026, 10:00am
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('todayKey returns the local calendar date', () => {
    expect(todayKey()).toBe('2026-03-15');
  });

  test('returns null when due is null', () => {
    expect(formatDueLabel(null, null)).toBeNull();
  });

  test('labels the current local date as Today', () => {
    expect(formatDueLabel('2026-03-15', null)).toBe('Today');
  });

  test('labels the next local calendar date as Tomorrow', () => {
    expect(formatDueLabel('2026-03-16', null)).toBe('Tomorrow');
  });

  test('labels other dates as MM-DD', () => {
    expect(formatDueLabel('2026-04-02', null)).toBe('04-02');
  });

  test('appends a 12-hour time when dueTime is set', () => {
    expect(formatDueLabel('2026-03-15', 90)).toBe('Today 1:30AM');
    expect(formatDueLabel('2026-03-15', 810)).toBe('Today 1:30PM');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/date-format.test.ts`
Expected: FAIL with "Cannot find module './date-format'" (or similar module-not-found error).

- [ ] **Step 3: Create `app/lib/date-format.ts`**

```ts
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayKey(): string {
  return localDateKey(new Date());
}

export function formatDueLabel(due: string | null, dueTime: number | null): string | null {
  if (!due) return null;
  const today = todayKey();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);
  let label = due === today ? 'Today' : due === tomorrow ? 'Tomorrow' : due.slice(5);
  if (dueTime != null) {
    const hours = Math.floor(dueTime / 60);
    const minutes = dueTime % 60;
    const period = hours < 12 ? 'AM' : 'PM';
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    label += ` ${hours12}:${String(minutes).padStart(2, '0')}${period}`;
  }
  return label;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/date-format.test.ts`
Expected: PASS, 6/6 tests.

- [ ] **Step 5: Create `app/lib/task-dto.ts`**

```ts
import type { Priority } from '@prisma/client';

export interface TaskDTO {
  id: string;
  text: string;
  listId: string;
  priority: Priority | null;
  due: string | null;
  dueTime: number | null;
  duration: number;
  done: boolean;
  order: number;
}

// Task.due is a Postgres `@db.Date` column, which Prisma always returns as a
// UTC-midnight Date regardless of server timezone — a plain UTC slice is the
// correct (and only) way to turn it back into the 'YYYY-MM-DD' key every DTO
// consumer expects. This is unrelated to the LOCAL-time "is this today?"
// comparison in app/lib/date-format.ts, which deliberately does not use this.
export function toDateKey(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export function serializeTask(task: {
  id: string;
  text: string;
  listId: string;
  priority: Priority | null;
  due: Date | null;
  dueTime: number | null;
  duration: number;
  done: boolean;
  order: number;
}): TaskDTO {
  return {
    id: task.id,
    text: task.text,
    listId: task.listId,
    priority: task.priority,
    due: toDateKey(task.due),
    dueTime: task.dueTime,
    duration: task.duration,
    done: task.done,
    order: task.order,
  };
}
```

No new test file for this step: `serializeTask`/`toDateKey`'s behavior is unchanged (pure move) and is already exhaustively covered by the existing `app/(app)/tasks/queries.integration.test.ts` and `app/(app)/tasks/actions.integration.test.ts`, which Step 9 below re-runs to confirm nothing broke.

- [ ] **Step 6: Update `app/(app)/tasks/queries.ts` to use the shared module**

Replace the full contents of `app/(app)/tasks/queries.ts` with:
```ts
import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export type { TaskDTO };

export interface TaskListDTO {
  id: string;
  name: string;
  order: number;
  tasks: TaskDTO[];
}

export async function getTaskLists(): Promise<TaskListDTO[]> {
  await verifySession();
  const lists = await prisma.taskList.findMany({
    orderBy: { order: 'asc' },
    include: { tasks: { orderBy: { order: 'asc' } } },
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    order: list.order,
    tasks: list.tasks.map(serializeTask),
  }));
}
```
The `export type { TaskDTO }` re-export means every existing file that imports `TaskDTO` from `'./queries'` (task-card.tsx, task-dialog.tsx, task-list-column.tsx, tasks-board.tsx, task-reorder.ts, actions.ts) keeps working with zero changes.

- [ ] **Step 7: Update `app/(app)/tasks/actions.ts` to use the shared module**

In `app/(app)/tasks/actions.ts`, replace the import block and delete the local `serializeTask` function:
```ts
'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { Priority } from '@prisma/client';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';
```
Delete this entire function block (it now lives in `app/lib/task-dto.ts`):
```ts
function serializeTask(task: {
  id: string;
  text: string;
  listId: string;
  priority: Priority | null;
  due: Date | null;
  dueTime: number | null;
  duration: number;
  done: boolean;
  order: number;
}): TaskDTO {
  return {
    id: task.id,
    text: task.text,
    listId: task.listId,
    priority: task.priority,
    due: task.due ? task.due.toISOString().slice(0, 10) : null,
    dueTime: task.dueTime,
    duration: task.duration,
    done: task.done,
    order: task.order,
  };
}
```
Every function below that calls `serializeTask(...)` is unchanged — only its source moved.

- [ ] **Step 8: Update `app/(app)/tasks/task-card.tsx` to use the shared module**

In `app/(app)/tasks/task-card.tsx`, replace the import block and delete the local `formatDueLabel` function:
```tsx
'use client';

import type { DragEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { PriorityFlag, PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import { formatDueLabel } from '@/app/lib/date-format';
import type { TaskDTO } from './queries';
```
Delete this function (it now lives in `app/lib/date-format.ts`):
```ts
function formatDueLabel(due: string | null, dueTime: number | null): string | null {
  if (!due) return null;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  let label = due === today ? 'Today' : due === tomorrow ? 'Tomorrow' : due.slice(5);
  if (dueTime != null) {
    const hours = Math.floor(dueTime / 60);
    const minutes = dueTime % 60;
    const period = hours < 12 ? 'AM' : 'PM';
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    label += ` ${hours12}:${String(minutes).padStart(2, '0')}${period}`;
  }
  return label;
}
```
The rest of the file (the `TaskCardProps` interface and `TaskCard` component) is unchanged.

- [ ] **Step 9: Run the full existing test suite to confirm no regressions**

Run: `npm test`
Expected: all existing tests still pass (114/114 as of the end of the Tasks phase, plus the 6 new `date-format.test.ts` tests = 120 total). If any `task-card.test.tsx` assertion about "Today"/"Tomorrow" unexpectedly fails, it means that test's fixture assumed the old UTC-based behavior — fix the *test* to use `vi.useFakeTimers()`/`vi.setSystemTime()` with an explicit local date, matching the pattern in `date-format.test.ts` above. Do not weaken the production fix to make a stale test pass. (As of this plan being written, `task-card.test.tsx` has no Today/Tomorrow test at all — only a fixed non-today date — so no such conflict is expected, but check.)

Run: `npm run test:integration`
Expected: all existing integration tests still pass (8/8 as of the end of the Tasks phase) — `queries.integration.test.ts` and `actions.integration.test.ts` exercise `serializeTask`/`toDateKey` indirectly through `getTaskLists`/the Server Actions, so this proves the moved code still works against real Postgres.

- [ ] **Step 10: Commit**

```bash
git add app/lib/task-dto.ts app/lib/date-format.ts app/lib/date-format.test.ts "app/(app)/tasks/queries.ts" "app/(app)/tasks/actions.ts" "app/(app)/tasks/task-card.tsx"
git commit -m "refactor: extract shared TaskDTO and due-label helpers, fix UTC date bug"
```

---

## Task 2: Add cross-page cache revalidation for Matrix-visible Task changes

Matrix is a second page reading the same `Task` rows the Tasks phase's actions already mutate. Every action that changes a Matrix-visible field (`priority`, `done`, `text`, `due`, `dueTime`, or whether the row exists at all) must also revalidate `/matrix`, or Next.js's route cache for `/matrix` won't reflect the change on next visit. `reorderTasks`/`reorderLists`/`createList` only change `order`/`listId`/create an empty list — none of those are Matrix-visible, so they're intentionally left unchanged.

**Files:**
- Modify: `app/(app)/tasks/actions.ts`
- Modify: `app/(app)/tasks/actions.integration.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: no new exports — same 8 actions, `deleteList`/`createTask`/`updateTask`/`deleteTask`/`toggleTaskDone` now each call `revalidatePath('/matrix')` in addition to their existing `revalidatePath('/tasks')`.

- [ ] **Step 1: Write the failing test**

In `app/(app)/tasks/actions.integration.test.ts`, change the `next/cache` mock from a no-op to a spy so calls can be asserted, and import it:
```ts
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
```
```ts
import { revalidatePath } from 'next/cache';
```
Add a `beforeEach` that clears the spy (existing `describe`/`afterEach` blocks are untouched):
```ts
beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});
```
Add this new test at the end of the `describe('task/list server actions', ...)` block, before the final closing `});`:
```ts
test('deleteList, createTask, updateTask, deleteTask, and toggleTaskDone all revalidate /matrix in addition to /tasks', async () => {
  const list = await createList('ActionTest RevalidateList');
  expect(revalidatePath).toHaveBeenCalledWith('/tasks');
  expect(revalidatePath).not.toHaveBeenCalledWith('/matrix');

  vi.mocked(revalidatePath).mockClear();
  const task = await createTask({ text: 'ActionTest revalidate task', listId: list.id });
  expect(revalidatePath).toHaveBeenCalledWith('/matrix');

  vi.mocked(revalidatePath).mockClear();
  await updateTask({ id: task.id, text: 'ActionTest revalidate task edited', listId: list.id, priority: null, due: null, dueTime: null });
  expect(revalidatePath).toHaveBeenCalledWith('/matrix');

  vi.mocked(revalidatePath).mockClear();
  await toggleTaskDone(task.id);
  expect(revalidatePath).toHaveBeenCalledWith('/matrix');

  vi.mocked(revalidatePath).mockClear();
  await deleteTask(task.id);
  expect(revalidatePath).toHaveBeenCalledWith('/matrix');

  vi.mocked(revalidatePath).mockClear();
  await deleteList(list.id);
  expect(revalidatePath).toHaveBeenCalledWith('/matrix');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --exclude "**/*.integration.test.ts" --config vitest.config.ts app/(app)/tasks/actions.integration.test.ts` — actually integration tests run via the dedicated script; run:
`npm run test:integration`
Expected: FAIL on the new test — `createList`'s first assertion passes (it already calls `revalidatePath('/tasks')` and doesn't call `/matrix`, correctly), but `createTask`'s `expect(revalidatePath).toHaveBeenCalledWith('/matrix')` fails since that call doesn't exist yet.

- [ ] **Step 3: Add the `/matrix` revalidation calls**

In `app/(app)/tasks/actions.ts`, add one `revalidatePath('/matrix');` line immediately after the existing `revalidatePath('/tasks');` line in each of these five functions (leave `createList`, `reorderLists`, and `reorderTasks` unchanged):

```ts
export async function deleteList(listId: string): Promise<void> {
  await verifySession();
  await prisma.taskList.delete({ where: { id: listId } });
  revalidatePath('/tasks');
  revalidatePath('/matrix');
}
```

```ts
export async function createTask(input: CreateTaskInput): Promise<TaskDTO> {
  await verifySession();
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error('Task text is required');
  const maxOrder = await prisma.task.aggregate({ where: { listId: input.listId }, _max: { order: true } });
  const task = await prisma.task.create({
    data: { text: trimmed, listId: input.listId, order: (maxOrder._max.order ?? -1) + 1 },
  });
  revalidatePath('/tasks');
  revalidatePath('/matrix');
  return serializeTask(task);
}
```

```ts
export async function updateTask(input: UpdateTaskInput): Promise<TaskDTO> {
  await verifySession();
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error('Task text is required');
  const task = await prisma.task.update({
    where: { id: input.id },
    data: {
      text: trimmed,
      listId: input.listId,
      priority: input.priority,
      due: input.due ? new Date(input.due) : null,
      dueTime: input.dueTime,
    },
  });
  revalidatePath('/tasks');
  revalidatePath('/matrix');
  return serializeTask(task);
}
```

```ts
export async function deleteTask(taskId: string): Promise<void> {
  await verifySession();
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath('/tasks');
  revalidatePath('/matrix');
}
```

```ts
export async function toggleTaskDone(taskId: string): Promise<TaskDTO> {
  await verifySession();
  const existing = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const task = await prisma.task.update({ where: { id: taskId }, data: { done: !existing.done } });
  revalidatePath('/tasks');
  revalidatePath('/matrix');
  return serializeTask(task);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:integration`
Expected: PASS, all tests including the new one.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/actions.ts" "app/(app)/tasks/actions.integration.test.ts"
git commit -m "feat: revalidate /matrix from every action that changes a Matrix-visible Task field"
```

---

## Task 3: Matrix data query

**Files:**
- Create: `app/(app)/matrix/queries.ts`
- Test: `app/(app)/matrix/queries.integration.test.ts`

**Interfaces:**
- Consumes: `serializeTask`, `TaskDTO` from `@/app/lib/task-dto` (Task 1).
- Produces: `getMatrixTasks(): Promise<TaskDTO[]>` — every non-done `Task` across all lists, ordered by `createdAt` ascending. Re-exports `TaskDTO` for this directory's later files to import from `'./queries'`.

- [ ] **Step 1: Write the failing integration test**

Create `app/(app)/matrix/queries.integration.test.ts`:
```ts
/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, afterAll, beforeAll, vi } from 'vitest';

// getMatrixTasks() calls verifySession(), which calls next/headers' cookies().
// Outside an actual Next.js request (i.e. under plain vitest), cookies()
// throws "called outside a request scope". Mock next/headers/next/navigation
// the same way app/lib/dal.test.ts (and the Tasks phase's integration tests)
// do, and seed a valid session cookie so verifySession() resolves normally.
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
import { getMatrixTasks } from './queries';

describe('getMatrixTasks', () => {
  let listId: string;

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
    const list = await prisma.taskList.create({ data: { name: 'MatrixTest List', order: 0 } });
    listId = list.id;
  });

  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'MatrixTest ' } } });
  });

  afterAll(async () => {
    await prisma.taskList.delete({ where: { id: listId } });
  });

  test('excludes done tasks', async () => {
    await prisma.task.create({ data: { text: 'MatrixTest done', listId, order: 0, done: true } });
    await prisma.task.create({ data: { text: 'MatrixTest not done', listId, order: 1, done: false } });
    const result = await getMatrixTasks();
    const texts = result.map((t) => t.text);
    expect(texts).toContain('MatrixTest not done');
    expect(texts).not.toContain('MatrixTest done');
  });

  test('includes both flagged and unflagged non-done tasks with their real priority', async () => {
    await prisma.task.create({ data: { text: 'MatrixTest flagged', listId, order: 2, priority: 'RED' } });
    await prisma.task.create({ data: { text: 'MatrixTest unflagged', listId, order: 3 } });
    const result = await getMatrixTasks();
    const flagged = result.find((t) => t.text === 'MatrixTest flagged');
    const unflagged = result.find((t) => t.text === 'MatrixTest unflagged');
    expect(flagged?.priority).toBe('RED');
    expect(unflagged?.priority).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:integration`
Expected: FAIL with "Cannot find module './queries'" (or similar).

- [ ] **Step 3: Create `app/(app)/matrix/queries.ts`**

```ts
import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeTask, type TaskDTO } from '@/app/lib/task-dto';

export type { TaskDTO };

export async function getMatrixTasks(): Promise<TaskDTO[]> {
  await verifySession();
  const tasks = await prisma.task.findMany({
    where: { done: false },
    orderBy: { createdAt: 'asc' },
  });
  return tasks.map(serializeTask);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:integration`
Expected: PASS, 2/2 new tests (plus all previously-passing integration tests still passing).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/matrix/queries.ts" "app/(app)/matrix/queries.integration.test.ts"
git commit -m "feat: add getMatrixTasks query"
```

---

## Task 4: Pure priority-grouping helper

**Files:**
- Create: `app/(app)/matrix/matrix-groups.ts`
- Test: `app/(app)/matrix/matrix-groups.test.ts`

**Interfaces:**
- Consumes: `TaskDTO` from `./queries` (Task 3).
- Produces: `MatrixGroups { RED: TaskDTO[]; AMBER: TaskDTO[]; BLUE: TaskDTO[]; GREEN: TaskDTO[]; unflagged: TaskDTO[] }`, `groupTasksByPriority(tasks: TaskDTO[]): MatrixGroups`.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/matrix/matrix-groups.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { groupTasksByPriority } from './matrix-groups';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

describe('groupTasksByPriority', () => {
  test('groups tasks into their priority bucket', () => {
    const tasks = [
      makeTask({ id: 't1', priority: 'RED' }),
      makeTask({ id: 't2', priority: 'AMBER' }),
      makeTask({ id: 't3', priority: 'BLUE' }),
      makeTask({ id: 't4', priority: 'GREEN' }),
      makeTask({ id: 't5', priority: null }),
    ];
    const groups = groupTasksByPriority(tasks);
    expect(groups.RED.map((t) => t.id)).toEqual(['t1']);
    expect(groups.AMBER.map((t) => t.id)).toEqual(['t2']);
    expect(groups.BLUE.map((t) => t.id)).toEqual(['t3']);
    expect(groups.GREEN.map((t) => t.id)).toEqual(['t4']);
    expect(groups.unflagged.map((t) => t.id)).toEqual(['t5']);
  });

  test('preserves the input order within each group', () => {
    const tasks = [
      makeTask({ id: 't1', priority: 'RED' }),
      makeTask({ id: 't2', priority: 'RED' }),
      makeTask({ id: 't3', priority: 'RED' }),
    ];
    const groups = groupTasksByPriority(tasks);
    expect(groups.RED.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
  });

  test('returns empty arrays for every group when given no tasks', () => {
    const groups = groupTasksByPriority([]);
    expect(groups).toEqual({ RED: [], AMBER: [], BLUE: [], GREEN: [], unflagged: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "app/(app)/matrix/matrix-groups.test.ts"`
Expected: FAIL with "Cannot find module './matrix-groups'".

- [ ] **Step 3: Create `app/(app)/matrix/matrix-groups.ts`**

```ts
import type { TaskDTO } from './queries';

export interface MatrixGroups {
  RED: TaskDTO[];
  AMBER: TaskDTO[];
  BLUE: TaskDTO[];
  GREEN: TaskDTO[];
  unflagged: TaskDTO[];
}

export function groupTasksByPriority(tasks: TaskDTO[]): MatrixGroups {
  const groups: MatrixGroups = { RED: [], AMBER: [], BLUE: [], GREEN: [], unflagged: [] };
  for (const task of tasks) {
    if (task.priority) {
      groups[task.priority].push(task);
    } else {
      groups.unflagged.push(task);
    }
  }
  return groups;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "app/(app)/matrix/matrix-groups.test.ts"`
Expected: PASS, 3/3 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/matrix/matrix-groups.ts" "app/(app)/matrix/matrix-groups.test.ts"
git commit -m "feat: add groupTasksByPriority pure function"
```

---

## Task 5: MatrixTaskRow component

The single-line task row used inside both a quadrant and the Unflagged panel: checkbox, text, due label. Unlike the Tasks phase's `TaskCard`, this row is not itself a drop target — in both the design spec and the actual mockup markup (`Personal productivity webapp/Productivity Klivr.dc.html`), `onDrop`/`onDragOver` are wired on the *quadrant/panel container*, never on individual task rows, since dropping a task anywhere in a quadrant has the same effect (set its priority to that quadrant's) regardless of which row it lands on.

**Files:**
- Create: `app/(app)/matrix/matrix-task-row.tsx`
- Test: `app/(app)/matrix/matrix-task-row.test.tsx`

**Interfaces:**
- Consumes: `TaskDTO` from `./queries` (Task 3), `CheckToggle` (`@/app/components/ui/check-toggle`), `formatDueLabel` (`@/app/lib/date-format`, Task 1).
- Produces: `MatrixTaskRow({ task, onToggleDone, onOpen, onDragStart, onTouchStart, onTouchMove, onTouchEnd, isTouchDragging? })`.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/matrix/matrix-task-row.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { MatrixTaskRow } from './matrix-task-row';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Buy milk',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function noop() {}

describe('MatrixTaskRow', () => {
  test('renders the task text', () => {
    render(<MatrixTaskRow task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('strikes through the text when done', () => {
    render(<MatrixTaskRow task={makeTask({ done: true })} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    expect(screen.getByText('Buy milk')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('renders a due label when due is set', () => {
    render(<MatrixTaskRow task={makeTask({ due: '2026-03-01' })} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    expect(screen.getByText('03-01')).toBeInTheDocument();
  });

  test('clicking the row calls onOpen with the task', async () => {
    const onOpen = vi.fn();
    const task = makeTask();
    render(<MatrixTaskRow task={task} onToggleDone={vi.fn()} onOpen={onOpen} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    await userEvent.click(screen.getByText('Buy milk'));
    expect(onOpen).toHaveBeenCalledWith(task);
  });

  test('toggling the checkbox calls onToggleDone but not onOpen', async () => {
    const onToggleDone = vi.fn();
    const onOpen = vi.fn();
    render(<MatrixTaskRow task={makeTask()} onToggleDone={onToggleDone} onOpen={onOpen} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggleDone).toHaveBeenCalledWith('t1');
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('firing dragStart calls the onDragStart handler', () => {
    const onDragStart = vi.fn();
    render(<MatrixTaskRow task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={onDragStart} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    fireEvent.dragStart(screen.getByText('Buy milk').closest('div')!);
    expect(onDragStart).toHaveBeenCalled();
  });

  test('applies touch-action:none only while isTouchDragging is true', () => {
    const { rerender } = render(<MatrixTaskRow task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    const row = screen.getByText('Buy milk').closest('div')!;
    expect(row).not.toHaveStyle({ touchAction: 'none' });
    rerender(<MatrixTaskRow task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} isTouchDragging />);
    expect(row).toHaveStyle({ touchAction: 'none' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "app/(app)/matrix/matrix-task-row.test.tsx"`
Expected: FAIL with "Cannot find module './matrix-task-row'".

- [ ] **Step 3: Create `app/(app)/matrix/matrix-task-row.tsx`**

```tsx
'use client';

import type { DragEvent, TouchEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { formatDueLabel } from '@/app/lib/date-format';
import type { TaskDTO } from './queries';

export interface MatrixTaskRowProps {
  task: TaskDTO;
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  onDragStart: (event: DragEvent) => void;
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: (event: TouchEvent) => void;
  isTouchDragging?: boolean;
}

export function MatrixTaskRow({
  task,
  onToggleDone,
  onOpen,
  onDragStart,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isTouchDragging,
}: MatrixTaskRowProps) {
  const dueLabel = formatDueLabel(task.due, task.dueTime);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={() => onOpen(task)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        background: isTouchDragging ? 'var(--surface-3)' : 'var(--surface)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        opacity: isTouchDragging ? 0.6 : 1,
        // Only the row actively being long-press-dragged suppresses native
        // touch scrolling — every other row keeps normal vertical scroll,
        // since touch-action:none on every row would break scrolling within
        // a quadrant's own task list.
        touchAction: isTouchDragging ? 'none' : 'pan-y',
      }}
    >
      <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} />
      <span
        style={{
          fontSize: 'var(--text-sm)',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textDecoration: task.done ? 'line-through' : 'none',
          color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
        }}
      >
        {task.text}
      </span>
      {dueLabel && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', flex: 'none', whiteSpace: 'nowrap' }}>
          {dueLabel}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "app/(app)/matrix/matrix-task-row.test.tsx"`
Expected: PASS, 7/7 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/matrix/matrix-task-row.tsx" "app/(app)/matrix/matrix-task-row.test.tsx"
git commit -m "feat: add MatrixTaskRow component"
```

---

## Task 6: QuadrantPanel and UnflaggedPanel components

**Files:**
- Create: `app/(app)/matrix/quadrant-panel.tsx`
- Test: `app/(app)/matrix/quadrant-panel.test.tsx`
- Create: `app/(app)/matrix/unflagged-panel.tsx`
- Test: `app/(app)/matrix/unflagged-panel.test.tsx`

**Interfaces:**
- Consumes: `PRIORITY_COLORS`, `PriorityKey` (`@/app/components/ui/priority-flag`), `MatrixTaskRow` (Task 5), `TaskDTO` (`./queries`, Task 3).
- Produces: `QUADRANT_INFO: Record<PriorityKey, { title: string; subtitle: string }>`, `QuadrantPanel({ priorityKey, tasks, onToggleDone, onOpen, onTaskDragStart, onDragOver, onDrop, onTaskTouchStart, onTaskTouchMove, onTaskTouchEnd, touchDragTaskId })`, `UnflaggedPanel({ tasks, onToggleDone, onOpen, onTaskDragStart, onDragOver, onDrop, onTaskTouchStart, onTaskTouchMove, onTaskTouchEnd, touchDragTaskId })`.

Quadrant copy is split into a bold action label (`title`) and a muted criteria description (`subtitle`), per the design spec's "Red = 'Urgent & important / Do first'" wording — this plan reads the action label as the primary heading and the urgency/importance description as the subtitle, matching common Eisenhower-matrix UI convention. The quadrant grid fills left-to-right, top-to-bottom in the order RED, AMBER, BLUE, GREEN (Do first / Schedule / Delegate / Eliminate), the standard Eisenhower layout. The quadrant box's tint/border colors are a best-effort match using this app's existing `color-mix(in srgb, <priority color> X%, ...)` convention already used in `task-card.tsx` — the actual mockup file (`Personal productivity webapp/Productivity Klivr.dc.html`) computes these as JS style objects with no literal CSS values checked in, so there is nothing more exact to copy; adjust the percentages in a real browser if they look off.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/matrix/quadrant-panel.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { QuadrantPanel } from './quadrant-panel';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Buy milk',
    listId: 'list1',
    priority: 'RED',
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function noop() {}

describe('QuadrantPanel', () => {
  test('renders the title, subtitle, and count for a priority', () => {
    render(
      <QuadrantPanel priorityKey="RED" tasks={[makeTask()]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Do first')).toBeInTheDocument();
    expect(screen.getByText('Urgent & important')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('shows the empty state when there are no tasks', () => {
    render(
      <QuadrantPanel priorityKey="GREEN" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  test('the container carries a data-quad attribute matching its priority', () => {
    render(
      <QuadrantPanel priorityKey="BLUE" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Delegate').closest('[data-quad]')).toHaveAttribute('data-quad', 'BLUE');
  });

  test('dropping on the container calls onDrop', () => {
    const onDrop = vi.fn();
    render(
      <QuadrantPanel priorityKey="AMBER" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={onDrop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    fireEvent.drop(screen.getByText('Schedule').closest('[data-quad]')!);
    expect(onDrop).toHaveBeenCalled();
  });

  test('dragging a task within the panel calls onTaskDragStart with that task', () => {
    const onTaskDragStart = vi.fn();
    const task = makeTask();
    render(
      <QuadrantPanel priorityKey="RED" tasks={[task]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={onTaskDragStart} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    fireEvent.dragStart(screen.getByText('Buy milk').closest('div')!);
    expect(onTaskDragStart).toHaveBeenCalledWith(task);
  });
});
```

Create `app/(app)/matrix/unflagged-panel.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { UnflaggedPanel } from './unflagged-panel';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Buy milk',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function noop() {}

describe('UnflaggedPanel', () => {
  test('renders the header, count, and tasks', () => {
    render(
      <UnflaggedPanel tasks={[makeTask()]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Unflagged')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('shows the empty state when there are no tasks', () => {
    render(
      <UnflaggedPanel tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Everything is flagged.')).toBeInTheDocument();
  });

  test('the container carries data-quad="none"', () => {
    render(
      <UnflaggedPanel tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Unflagged').closest('[data-quad]')).toHaveAttribute('data-quad', 'none');
  });

  test('dropping on the container calls onDrop', () => {
    const onDrop = vi.fn();
    render(
      <UnflaggedPanel tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={onDrop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    fireEvent.drop(screen.getByText('Unflagged').closest('[data-quad]')!);
    expect(onDrop).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/matrix/quadrant-panel.test.tsx" "app/(app)/matrix/unflagged-panel.test.tsx"`
Expected: FAIL with "Cannot find module" errors for both.

- [ ] **Step 3: Create `app/(app)/matrix/quadrant-panel.tsx`**

```tsx
'use client';

import type { DragEvent, TouchEvent } from 'react';
import { PRIORITY_COLORS, type PriorityKey } from '@/app/components/ui/priority-flag';
import { MatrixTaskRow } from './matrix-task-row';
import type { TaskDTO } from './queries';

export const QUADRANT_INFO: Record<PriorityKey, { title: string; subtitle: string }> = {
  RED: { title: 'Do first', subtitle: 'Urgent & important' },
  AMBER: { title: 'Schedule', subtitle: 'Not urgent but important' },
  BLUE: { title: 'Delegate', subtitle: 'Urgent but unimportant' },
  GREEN: { title: 'Eliminate', subtitle: 'Not urgent & unimportant' },
};

export interface QuadrantPanelProps {
  priorityKey: PriorityKey;
  tasks: TaskDTO[];
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onTaskTouchStart: (task: TaskDTO, event: TouchEvent) => void;
  onTaskTouchMove: (event: TouchEvent) => void;
  onTaskTouchEnd: (event: TouchEvent) => void;
  touchDragTaskId: string | null;
}

export function QuadrantPanel({
  priorityKey,
  tasks,
  onToggleDone,
  onOpen,
  onTaskDragStart,
  onDragOver,
  onDrop,
  onTaskTouchStart,
  onTaskTouchMove,
  onTaskTouchEnd,
  touchDragTaskId,
}: QuadrantPanelProps) {
  const { title, subtitle } = QUADRANT_INFO[priorityKey];
  const color = PRIORITY_COLORS[priorityKey];

  return (
    <div
      data-quad={priorityKey}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        borderRadius: 'var(--radius-lg)',
        border: `1px solid color-mix(in srgb, ${color} 30%, var(--border))`,
        background: `color-mix(in srgb, ${color} 5%, var(--surface))`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 'var(--space-4) var(--space-4) var(--space-3)', flex: 'none' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{title}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>{tasks.length}</span>
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginLeft: 'auto' }}>{subtitle}</span>
      </div>
      <div className="pw-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '0 var(--space-4) var(--space-4)' }}>
        {tasks.map((task) => (
          <MatrixTaskRow
            key={task.id}
            task={task}
            onToggleDone={onToggleDone}
            onOpen={onOpen}
            onDragStart={() => onTaskDragStart(task)}
            onTouchStart={(event) => onTaskTouchStart(task, event)}
            onTouchMove={onTaskTouchMove}
            onTouchEnd={onTaskTouchEnd}
            isTouchDragging={touchDragTaskId === task.id}
          />
        ))}
        {tasks.length === 0 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', padding: '6px 2px', margin: 0 }}>Nothing here.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/(app)/matrix/unflagged-panel.tsx`**

```tsx
'use client';

import type { DragEvent, TouchEvent } from 'react';
import { MatrixTaskRow } from './matrix-task-row';
import type { TaskDTO } from './queries';

export interface UnflaggedPanelProps {
  tasks: TaskDTO[];
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onTaskTouchStart: (task: TaskDTO, event: TouchEvent) => void;
  onTaskTouchMove: (event: TouchEvent) => void;
  onTaskTouchEnd: (event: TouchEvent) => void;
  touchDragTaskId: string | null;
}

export function UnflaggedPanel({
  tasks,
  onToggleDone,
  onOpen,
  onTaskDragStart,
  onDragOver,
  onDrop,
  onTaskTouchStart,
  onTaskTouchMove,
  onTaskTouchEnd,
  touchDragTaskId,
}: UnflaggedPanelProps) {
  return (
    <aside
      data-quad="none"
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="pw-matrix-right pw-scroll"
      style={{
        flex: 35,
        minWidth: 0,
        overflow: 'auto',
        padding: '0 clamp(16px, 3vw, 32px) 24px var(--space-4)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Unflagged
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>{tasks.length}</span>
      </div>
      {tasks.map((task) => (
        <MatrixTaskRow
          key={task.id}
          task={task}
          onToggleDone={onToggleDone}
          onOpen={onOpen}
          onDragStart={() => onTaskDragStart(task)}
          onTouchStart={(event) => onTaskTouchStart(task, event)}
          onTouchMove={onTaskTouchMove}
          onTouchEnd={onTaskTouchEnd}
          isTouchDragging={touchDragTaskId === task.id}
        />
      ))}
      {tasks.length === 0 && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', margin: '2px 0' }}>Everything is flagged.</p>
      )}
    </aside>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/matrix/quadrant-panel.test.tsx" "app/(app)/matrix/unflagged-panel.test.tsx"`
Expected: PASS, 5/5 and 4/4.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/matrix/quadrant-panel.tsx" "app/(app)/matrix/quadrant-panel.test.tsx" "app/(app)/matrix/unflagged-panel.tsx" "app/(app)/matrix/unflagged-panel.test.tsx"
git commit -m "feat: add QuadrantPanel and UnflaggedPanel components"
```

---

## Task 7: MatrixBoard orchestrator — state, desktop drag-and-drop, dialog reuse

This is the main client component. It owns the flat `tasks` array, desktop drag state (`dragTaskId`), the edit dialog, and every mutation handler — all with revert-on-failure error handling built in from this first version (the Tasks phase deferred this to a post-merge fix; this plan doesn't repeat that). Mobile touch drag-and-drop is added in Task 8: this task wires `onTaskTouchStart`/`onTaskTouchMove`/`onTaskTouchEnd` as inert no-ops (touch gestures do nothing yet) — a genuine, complete, independently-reviewable increment, since desktop drag-and-drop, click-to-edit, checkbox-toggle, and delete all fully work and are fully tested here.

**Files:**
- Create: `app/(app)/matrix/matrix-board.tsx`
- Test: `app/(app)/matrix/matrix-board.test.tsx`

**Interfaces:**
- Consumes: `QuadrantPanel`, `UnflaggedPanel` (Task 6), `groupTasksByPriority` (Task 4), `TaskDialog`/`TaskDialogValues` (`../tasks/task-dialog`), `updateTask`/`deleteTask`/`toggleTaskDone` (`../tasks/actions`), `TaskDTO` (`./queries`), `TaskListDTO` (`../tasks/queries`).
- Produces: `MatrixBoard({ initialTasks: TaskDTO[]; lists: TaskListDTO[] })`.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/matrix/matrix-board.test.tsx`:
```tsx
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MatrixBoard } from './matrix-board';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

vi.mock('../tasks/actions', () => ({
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
    text: 'Buy milk',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: true,
    order: 0,
  })),
}));

import * as actions from '../tasks/actions';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Buy milk',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

const lists: TaskListDTO[] = [{ id: 'list1', name: 'Work', order: 0, tasks: [] }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MatrixBoard', () => {
  test('renders unflagged tasks in the Unflagged panel', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Unflagged')).toBeInTheDocument();
  });

  test('renders a flagged task in its quadrant', () => {
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' })]} lists={lists} />);
    expect(screen.getByText('Do first')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('dragging an unflagged task onto a quadrant calls updateTask with the new priority', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    const quadrant = screen.getByText('Do first').closest('[data-quad]')!;
    fireEvent.drop(quadrant);
    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', priority: 'RED' }));
  });

  test('dragging a flagged task onto the Unflagged panel clears its priority', () => {
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' })]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    const unflaggedPanel = screen.getByText('Unflagged').closest('[data-quad]')!;
    fireEvent.drop(unflaggedPanel);
    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', priority: null }));
  });

  test('toggling a task as done removes it from the matrix view optimistically', async () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(actions.toggleTaskDone).toHaveBeenCalledWith('t1');
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  test('clicking a task opens the edit dialog; saving calls updateTask and keeps it visible', async () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByText('Buy milk'));
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(actions.updateTask).toHaveBeenCalled();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('deleting from the dialog removes the task and calls deleteTask', async () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    await userEvent.click(screen.getByText('Buy milk'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(actions.deleteTask).toHaveBeenCalledWith('t1');
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
  });

  test('an abandoned drag (dragend without a drop) clears drag state so a later drop is a no-op', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    act(() => {
      window.dispatchEvent(new Event('dragend'));
    });
    const quadrant = screen.getByText('Do first').closest('[data-quad]')!;
    fireEvent.drop(quadrant);
    expect(actions.updateTask).not.toHaveBeenCalled();
  });

  test('a failed drag-drop update reverts the optimistic move and alerts the user', async () => {
    vi.mocked(actions.updateTask).mockRejectedValueOnce(new Error('network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    const quadrant = screen.getByText('Do first').closest('[data-quad]')!;
    fireEvent.drop(quadrant);
    await waitFor(() => {
      expect(screen.getByText('Unflagged').closest('[data-quad]')).toContainElement(screen.getByText('Buy milk'));
    });
    expect(alertSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/matrix/matrix-board.test.tsx"`
Expected: FAIL with "Cannot find module './matrix-board'".

- [ ] **Step 3: Create `app/(app)/matrix/matrix-board.tsx`**

```tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { DragEvent } from 'react';
import type { Priority } from '@prisma/client';
import { QuadrantPanel } from './quadrant-panel';
import { UnflaggedPanel } from './unflagged-panel';
import { groupTasksByPriority } from './matrix-groups';
import { TaskDialog, type TaskDialogValues } from '../tasks/task-dialog';
import { updateTask, deleteTask, toggleTaskDone } from '../tasks/actions';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

const QUADRANT_KEYS: Priority[] = ['RED', 'AMBER', 'BLUE', 'GREEN'];

export interface MatrixBoardProps {
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

export function MatrixBoard({ initialTasks, lists }: MatrixBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ task: TaskDTO; values: TaskDialogValues } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function clearDragState() {
      setDragTaskId(null);
    }
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, []);

  function applyPriorityChange(taskId: string, priority: Priority | null) {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
    startTransition(async () => {
      try {
        await updateTask({
          id: taskId,
          text: target.text,
          listId: target.listId,
          priority,
          due: target.due,
          dueTime: target.dueTime,
        });
      } catch {
        setTasks(prevTasks);
        window.alert('Could not update the task. Please try again.');
      }
    });
  }

  function handleDrop(priority: Priority | null) {
    if (!dragTaskId) return;
    applyPriorityChange(dragTaskId, priority);
    setDragTaskId(null);
  }

  function handleToggleDone(taskId: string) {
    // A task only ever appears in Matrix while done === false (getMatrixTasks
    // filters it out otherwise), so the only real transition here is
    // false -> true. Optimistically remove it immediately rather than
    // toggling a strikethrough style in place, since Matrix excludes done
    // tasks from the whole view, not just this task's own list column.
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTransition(async () => {
      try {
        await toggleTaskDone(taskId);
      } catch {
        setTasks(prevTasks);
        window.alert('Could not update the task. Please try again.');
      }
    });
  }

  function handleOpenTask(task: TaskDTO) {
    setDialog({ task, values: taskToDialogValues(task) });
  }

  function handleSaveDialog(values: TaskDialogValues) {
    if (!dialog) return;
    const taskId = dialog.task.id;
    const dueTime = parseDueTime(values.dueTime);
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
        // The dialog never changes `done`, so the task always stays in this
        // flat, done=false-only array — no filter/append branching needed,
        // unlike the Tasks-phase kanban board's list-grouped state.
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      } catch {
        window.alert('Could not save the task. Please try again.');
      }
    });
    setDialog(null);
  }

  function handleDeleteFromDialog() {
    if (!dialog?.task) return;
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

  const groups = groupTasksByPriority(tasks);

  return (
    <div className="pw-matrix">
      <div className="pw-matrix-left pw-scroll" style={{ flex: 65, minWidth: 0, overflow: 'auto', padding: '0 var(--space-4) 24px clamp(16px, 3vw, 32px)' }}>
        <div className="pw-quadgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)', alignContent: 'start' }}>
          {QUADRANT_KEYS.map((key) => (
            <QuadrantPanel
              key={key}
              priorityKey={key}
              tasks={groups[key]}
              onToggleDone={handleToggleDone}
              onOpen={handleOpenTask}
              onTaskDragStart={(task) => setDragTaskId(task.id)}
              onDragOver={(event: DragEvent) => event.preventDefault()}
              onDrop={(event: DragEvent) => {
                event.preventDefault();
                handleDrop(key);
              }}
              onTaskTouchStart={() => {}}
              onTaskTouchMove={() => {}}
              onTaskTouchEnd={() => {}}
              touchDragTaskId={null}
            />
          ))}
        </div>
      </div>
      <UnflaggedPanel
        tasks={groups.unflagged}
        onToggleDone={handleToggleDone}
        onOpen={handleOpenTask}
        onTaskDragStart={(task) => setDragTaskId(task.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop(null);
        }}
        onTaskTouchStart={() => {}}
        onTaskTouchMove={() => {}}
        onTaskTouchEnd={() => {}}
        touchDragTaskId={null}
      />
      {dialog && (
        <TaskDialog
          open
          mode="edit"
          lists={lists}
          initialValues={dialog.values}
          onClose={() => setDialog(null)}
          onSave={handleSaveDialog}
          onDelete={handleDeleteFromDialog}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/matrix/matrix-board.test.tsx"`
Expected: PASS, 9/9 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/matrix/matrix-board.tsx" "app/(app)/matrix/matrix-board.test.tsx"
git commit -m "feat: add MatrixBoard with desktop drag-and-drop"
```

---

## Task 8: Mobile long-press touch drag-and-drop

Adds the touch-based drag state machine described in the design spec: a 280ms long-press (with a small movement-cancel threshold so ordinary scrolling isn't hijacked) starts a touch-drag, `navigator.vibrate` gives haptic feedback when it engages, `document.elementFromPoint` hit-tests which quadrant/panel is under the finger during `touchmove`, and lifting the finger over a valid target applies the same `applyPriorityChange` desktop drops already use. All three techniques below (`fireEvent.touchStart/Move/End`, direct assignment of `document.elementFromPoint`, `navigator.vibrate` via `Object.defineProperty`) were spiked and confirmed working in this exact project before this plan was written — see this plan's Global Constraints.

**Files:**
- Modify: `app/(app)/matrix/matrix-board.tsx`
- Modify: `app/(app)/matrix/matrix-board.test.tsx`

**Interfaces:**
- No new exports — `MatrixBoard`'s props are unchanged. `QuadrantPanel`/`UnflaggedPanel`'s `onTaskTouchStart`/`onTaskTouchMove`/`onTaskTouchEnd`/`touchDragTaskId` props (already defined in Task 6) are now wired to real handlers instead of Task 7's no-ops.

- [ ] **Step 1: Write the failing tests**

Add this new `describe` block to the end of `app/(app)/matrix/matrix-board.test.tsx` (the existing `describe('MatrixBoard', ...)` block above is unchanged):
```tsx
describe('MatrixBoard mobile long-press drag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a long press (280ms) followed by a release over a quadrant sets the new priority', () => {
    const quadrantEl = document.createElement('div');
    quadrantEl.setAttribute('data-quad', 'RED');
    document.elementFromPoint = vi.fn().mockReturnValue(quadrantEl);

    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    vi.advanceTimersByTime(280);
    fireEvent.touchMove(card, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchEnd(card);

    expect(actions.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', priority: 'RED' }));
  });

  test('releasing before 280ms does not trigger a drag (acts as a normal tap)', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    vi.advanceTimersByTime(100);
    fireEvent.touchEnd(card);
    expect(actions.updateTask).not.toHaveBeenCalled();
  });

  test('moving more than 10px before 280ms cancels the long-press (treated as a scroll)', () => {
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchMove(card, { touches: [{ clientX: 30, clientY: 10 }] });
    vi.advanceTimersByTime(280);
    fireEvent.touchEnd(card);
    expect(actions.updateTask).not.toHaveBeenCalled();
  });

  test('calls navigator.vibrate when the long-press engages', () => {
    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrateSpy, configurable: true });
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    vi.advanceTimersByTime(280);
    expect(vibrateSpy).toHaveBeenCalledWith(10);
    fireEvent.touchEnd(card);
  });

  test('releasing over no valid target does not change the task', () => {
    document.elementFromPoint = vi.fn().mockReturnValue(null);
    render(<MatrixBoard initialTasks={[makeTask()]} lists={lists} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.touchStart(card, { touches: [{ clientX: 10, clientY: 10 }] });
    vi.advanceTimersByTime(280);
    fireEvent.touchMove(card, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchEnd(card);
    expect(actions.updateTask).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/matrix/matrix-board.test.tsx"`
Expected: FAIL — the new touch tests fail because `updateTask`/`navigator.vibrate` are never actually invoked yet (Task 7's handlers are no-ops).

- [ ] **Step 3: Add the touch drag state machine to `matrix-board.tsx`**

Change the two `react` imports at the top of the file:
```tsx
import { useState, useEffect, useRef, useTransition } from 'react';
import type { DragEvent, TouchEvent } from 'react';
```

Add these two module-level constants right after the imports (before `const QUADRANT_KEYS`):
```tsx
const LONG_PRESS_MS = 280;
const TOUCH_MOVE_CANCEL_PX = 10;
```

Add this state and these refs inside `MatrixBoard`, right after the existing `const [dialog, setDialog] = useState...` line:
```tsx
const [touchDragTaskId, setTouchDragTaskId] = useState<string | null>(null);
const [touchHoverTarget, setTouchHoverTarget] = useState<string | null>(null);
const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const touchStartPos = useRef<{ x: number; y: number } | null>(null);
```

Add a cleanup effect right after the existing `dragend` `useEffect` block, so an in-flight long-press timer doesn't fire after unmount:
```tsx
useEffect(() => {
  return () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
}, []);
```

Add these three handlers inside `MatrixBoard`, after `handleDrop` and before `handleToggleDone`:
```tsx
function handleTaskTouchStart(task: TaskDTO, event: TouchEvent) {
  const touch = event.touches[0];
  touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  longPressTimer.current = setTimeout(() => {
    setTouchDragTaskId(task.id);
    navigator.vibrate?.(10);
  }, LONG_PRESS_MS);
}

function handleTaskTouchMove(event: TouchEvent) {
  const touch = event.touches[0];
  if (!touchDragTaskId) {
    if (touchStartPos.current && longPressTimer.current) {
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      if (Math.hypot(dx, dy) > TOUCH_MOVE_CANCEL_PX) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    return;
  }
  // A long-press has engaged: this is now a drag, not a scroll.
  event.preventDefault();
  const target = (document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null)?.closest<HTMLElement>(
    '[data-quad]'
  );
  setTouchHoverTarget(target?.dataset.quad ?? null);
}

function handleTaskTouchEnd() {
  if (longPressTimer.current) {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }
  touchStartPos.current = null;
  if (touchDragTaskId && touchHoverTarget) {
    const priority = touchHoverTarget === 'none' ? null : (touchHoverTarget as Priority);
    applyPriorityChange(touchDragTaskId, priority);
  }
  setTouchDragTaskId(null);
  setTouchHoverTarget(null);
}
```

Replace the four `onTaskTouchStart={() => {}}` / `onTaskTouchMove={() => {}}` / `onTaskTouchEnd={() => {}}` / `touchDragTaskId={null}` no-op lines (two each, one set per `QuadrantPanel`/`UnflaggedPanel` instance) with:
```tsx
onTaskTouchStart={handleTaskTouchStart}
onTaskTouchMove={handleTaskTouchMove}
onTaskTouchEnd={handleTaskTouchEnd}
touchDragTaskId={touchDragTaskId}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/matrix/matrix-board.test.tsx"`
Expected: PASS, 14/14 tests (9 from Task 7 + 5 new touch tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/matrix/matrix-board.tsx" "app/(app)/matrix/matrix-board.test.tsx"
git commit -m "feat: add mobile long-press drag-and-drop to MatrixBoard"
```

---

## Task 9: Responsive tab switcher for narrow screens (≤860px)

Above 860px, both the quadrant grid and the Unflagged panel are always visible (side-by-side above 900px, stacked between 861–900px — both already handled by CSS rules already present in `app/styles/layout.css` from the Foundation phase, no new CSS needed). At ≤860px, only one is shown at a time, switched via a `PillToggle`, matching the design spec and the mockup's `matrixShowTabs`/`showMatrixGrid`/`showUnflagged` structure.

**Files:**
- Create: `app/lib/use-media-query.ts`
- Create: `app/lib/use-media-query.test.ts`
- Modify: `app/(app)/matrix/matrix-board.tsx`
- Modify: `app/(app)/matrix/matrix-board.test.tsx`

**Interfaces:**
- Produces: `useMediaQuery(query: string): boolean` from `app/lib/use-media-query.ts` — a small, generically reusable hook (later Calendar-phase breakpoint logic can reuse it; this is a minimal, justified extraction, not speculative — the design spec's Calendar section already describes its own mobile-specific rendering).
- Consumes (in `matrix-board.tsx`): `useMediaQuery`, `PillToggle` (`@/app/components/ui/pill-toggle`).

- [ ] **Step 1: Write the failing test for the hook**

Create `app/lib/use-media-query.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  test('returns the current match and updates on a change event', () => {
    const listeners: Array<() => void> = [];
    let matches = false;
    const mockMql = {
      get matches() {
        return matches;
      },
      addEventListener: vi.fn((_: string, cb: () => void) => listeners.push(cb)),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mockMql));

    const { result } = renderHook(() => useMediaQuery('(max-width: 860px)'));
    expect(result.current).toBe(false);

    matches = true;
    act(() => {
      listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);

    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/use-media-query.test.ts`
Expected: FAIL with "Cannot find module './use-media-query'".

- [ ] **Step 3: Create `app/lib/use-media-query.ts`**

```ts
'use client';

import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  function subscribe(callback: () => void) {
    const mq = window.matchMedia(query);
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
  }
  function getSnapshot() {
    return window.matchMedia(query).matches;
  }
  function getServerSnapshot() {
    return false;
  }
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```
This uses `useSyncExternalStore` rather than a `useEffect` reading `window.matchMedia(...).matches` and calling `setState` in the effect body — that pattern trips this repo's `react-hooks/set-state-in-effect` ESLint rule (verified directly against this exact code by the plan's author before this plan was written: `npx eslint` on the effect-based version reports "Calling setState synchronously within an effect can trigger cascading renders"). `useSyncExternalStore` is React's own documented solution for subscribing to an external browser API with a value that must default to something SSR-safe (`getServerSnapshot` returns `false`, since `window` doesn't exist on the server) — it doesn't touch `useEffect` at all, so the rule doesn't apply, and it was verified lint-clean and functionally correct under jsdom before this plan was written.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/use-media-query.test.ts`
Expected: PASS, 1/1 test.

- [ ] **Step 5: Write the failing tests for MatrixBoard's responsive behavior**

Add this new `describe` block to the end of `app/(app)/matrix/matrix-board.test.tsx`:
```tsx
describe('MatrixBoard responsive tabs', () => {
  function mockNarrow(matches: boolean) {
    const mockMql = {
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mockMql));
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('shows both panels with no tab switcher when wide', () => {
    mockNarrow(false);
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' }), makeTask({ id: 't2', text: 'Buy eggs' })]} lists={lists} />);
    expect(screen.getByText('Do first')).toBeInTheDocument();
    expect(screen.getByText('Unflagged')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  test('shows only the Matrix tab content by default when narrow', () => {
    mockNarrow(true);
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' }), makeTask({ id: 't2', text: 'Buy eggs' })]} lists={lists} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByText('Do first')).toBeInTheDocument();
    expect(screen.queryByText('Unflagged')).not.toBeInTheDocument();
  });

  test('switching to the Unflagged tab shows the unflagged panel instead', async () => {
    mockNarrow(true);
    render(<MatrixBoard initialTasks={[makeTask({ priority: 'RED' }), makeTask({ id: 't2', text: 'Buy eggs' })]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: /Unflagged/ }));
    expect(screen.getByText('Unflagged')).toBeInTheDocument();
    expect(screen.queryByText('Do first')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run "app/(app)/matrix/matrix-board.test.tsx"`
Expected: FAIL — no tab switcher exists yet, both panels always render regardless of the mocked `matchMedia`.

- [ ] **Step 7: Add the tab switcher to `matrix-board.tsx`**

Add these two imports:
```tsx
import { PillToggle } from '@/app/components/ui/pill-toggle';
import { useMediaQuery } from '@/app/lib/use-media-query';
```

Add this inside `MatrixBoard`, right after the `const [dialog, setDialog] = useState...` line:
```tsx
const isNarrow = useMediaQuery('(max-width: 860px)');
const [activeTab, setActiveTab] = useState<'matrix' | 'unflagged'>('matrix');
```

Replace the component's `return` statement with:
```tsx
return (
  <div className="pw-matrix">
    {isNarrow && (
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px', flex: 'none' }}>
        <PillToggle
          ariaLabel="Matrix view"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'matrix', label: 'Matrix' },
            { value: 'unflagged', label: `Unflagged · ${groups.unflagged.length}` },
          ]}
        />
      </div>
    )}
    {(!isNarrow || activeTab === 'matrix') && (
      <div className="pw-matrix-left pw-scroll" style={{ flex: 65, minWidth: 0, overflow: 'auto', padding: '0 var(--space-4) 24px clamp(16px, 3vw, 32px)' }}>
        <div className="pw-quadgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)', alignContent: 'start' }}>
          {QUADRANT_KEYS.map((key) => (
            <QuadrantPanel
              key={key}
              priorityKey={key}
              tasks={groups[key]}
              onToggleDone={handleToggleDone}
              onOpen={handleOpenTask}
              onTaskDragStart={(task) => setDragTaskId(task.id)}
              onDragOver={(event: DragEvent) => event.preventDefault()}
              onDrop={(event: DragEvent) => {
                event.preventDefault();
                handleDrop(key);
              }}
              onTaskTouchStart={handleTaskTouchStart}
              onTaskTouchMove={handleTaskTouchMove}
              onTaskTouchEnd={handleTaskTouchEnd}
              touchDragTaskId={touchDragTaskId}
            />
          ))}
        </div>
      </div>
    )}
    {(!isNarrow || activeTab === 'unflagged') && (
      <UnflaggedPanel
        tasks={groups.unflagged}
        onToggleDone={handleToggleDone}
        onOpen={handleOpenTask}
        onTaskDragStart={(task) => setDragTaskId(task.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop(null);
        }}
        onTaskTouchStart={handleTaskTouchStart}
        onTaskTouchMove={handleTaskTouchMove}
        onTaskTouchEnd={handleTaskTouchEnd}
        touchDragTaskId={touchDragTaskId}
      />
    )}
    {dialog && (
      <TaskDialog
        open
        mode="edit"
        lists={lists}
        initialValues={dialog.values}
        onClose={() => setDialog(null)}
        onSave={handleSaveDialog}
        onDelete={handleDeleteFromDialog}
      />
    )}
  </div>
);
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run "app/(app)/matrix/matrix-board.test.tsx"`
Expected: PASS, 17/17 tests (14 from Tasks 7–8 + 3 new responsive tests).

- [ ] **Step 9: Commit**

```bash
git add app/lib/use-media-query.ts app/lib/use-media-query.test.ts "app/(app)/matrix/matrix-board.tsx" "app/(app)/matrix/matrix-board.test.tsx"
git commit -m "feat: add responsive tab switcher to MatrixBoard for narrow screens"
```

---

## Task 10: Wire into /matrix and manual walkthrough

**Files:**
- Modify: `app/(app)/matrix/page.tsx`
- Modify: `app/(app)/stub-pages.test.tsx`

**Interfaces:**
- Consumes: `getMatrixTasks` (`./queries`, Task 3), `getTaskLists` (`../tasks/queries`, already exists), `MatrixBoard` (Task 9's final version).

- [ ] **Step 1: Replace the stub page**

Replace the full contents of `app/(app)/matrix/page.tsx`:
```tsx
import { getMatrixTasks } from './queries';
import { getTaskLists } from '../tasks/queries';
import { MatrixBoard } from './matrix-board';

export default async function MatrixPage() {
  const [tasks, lists] = await Promise.all([getMatrixTasks(), getTaskLists()]);
  return <MatrixBoard initialTasks={tasks} lists={lists} />;
}
```

- [ ] **Step 2: Run the unit suite and fix the now-broken stub-pages test**

Run: `npm test`
Expected: FAIL — `app/(app)/stub-pages.test.tsx` renders `MatrixPage` synchronously via `render(<MatrixPage />)` and asserts a "Matrix" heading; `MatrixPage` is now an async Server Component, which cannot be rendered that way (same failure shape the Tasks phase hit for `TasksPage` in this same file).

In `app/(app)/stub-pages.test.tsx`, remove the `MatrixPage` import and its row from the `pages` array, following the exact precedent already in that file for `TasksPage`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';
import CalendarPage from './calendar/page';
import HabitsPage from './habits/page';
import JournalPage from './journal/page';

// Tasks and Matrix are no longer stub pages (see ./tasks/tasks-board.test.tsx
// and ./matrix/matrix-board.test.tsx) so both are intentionally excluded from
// this table-driven stub-page test.
const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
  { Component: CalendarPage, heading: 'Calendar' },
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
Expected: PASS, all tests (the Tasks-phase count plus this plan's ~45 new tests across Tasks 1–9, minus the one removed "Matrix page renders its heading" row).

Run: `npm run test:integration`
Expected: PASS, all integration tests (Tasks-phase count + this plan's Task 2 and Task 3 additions).

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npx eslint "app/(app)/matrix" "app/(app)/tasks" app/lib`
Expected: exit 0.

Run: `npm run build`
Expected: succeeds; `/matrix` appears in the route table as a dynamic (`ƒ`) route, same as `/tasks`.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/matrix/page.tsx" "app/(app)/stub-pages.test.tsx"
git commit -m "feat: wire the Eisenhower Matrix into /matrix"
```

- [ ] **Step 5: Manual walkthrough (document what can and can't be verified without a browser)**

Following the exact precedent from the Tasks phase's final task: start `npm run dev` (checking for and killing stray node processes first; clear `.next` first too — a stale `.next/dev` cache served a 404 for `/login` mid-way through the Tasks phase's own manual verification and had to be cleared). Verify via curl:
1. `GET /matrix` unauthenticated redirects to `/login` (proves the route-group layout's session guard covers the new route, same as it does for `/tasks`).
2. Log in for real (this plan's author has the real dev credentials; an implementer subagent does not, and should not attempt to work around that — same documented constraint as the Tasks phase).
3. `GET /matrix` authenticated returns 200 and the page's real data.

Desktop drag-and-drop and mobile long-press cannot be replicated over curl (no discrete HTTP request corresponds to a drag gesture) — this is not a gap specific to this plan; it's the same limitation the Tasks phase documented for its own kanban drag-and-drop. What stands in for that live proof:
- `app/(app)/matrix/matrix-board.test.tsx`'s 16 tests (Tasks 7–9) exercise the full desktop-drag, mobile-long-press, and responsive-tab-switch logic end-to-end at the component level, using the verified-working `fireEvent.dragStart/drop`, `fireEvent.touchStart/Move/End`, `document.elementFromPoint` reassignment, and `vi.stubGlobal('matchMedia', ...)` techniques.
- `app/(app)/matrix/actions` reuse (there are none — Matrix calls the Tasks phase's `updateTask`/`deleteTask`/`toggleTaskDone` directly) means the underlying mutation logic this drag-and-drop ultimately calls is the exact same code already proven against real Postgres by `app/(app)/tasks/actions.integration.test.ts`, and already proven over real HTTP by the controller's own curl-based `Next-Action` RPC verification during the Tasks phase's Task 9. Matrix doesn't introduce any new server-side mutation path that hasn't already been live-verified.
- What genuinely has zero verification beyond jsdom-simulated events: real touchscreen behavior (whether `touchAction: 'none'`/`preventDefault()` actually suppress native scroll during a real drag on a real phone, and whether `navigator.vibrate` produces a perceptible tick on a device that supports it). This is a real, honestly-disclosed gap — recommend a real-device spot-check before treating the mobile experience as fully done, the same way the Tasks phase recommended a real-browser click-through for its own drag-and-drop before merge.

---

## Self-review notes

- **Spec coverage:** design spec §4.3 — 2×2 quadrant grid + Unflagged panel (Tasks 4–7), fixed quadrant semantics via the single `Priority` enum (Task 4), desktop native HTML5 DnD (Task 7), mobile 280ms long-press + touch-move hit-testing + `navigator.vibrate` (Task 8), ≤900px stacked / ≤860px 2-tab pill switcher (Task 9), done tasks excluded from the whole view (Task 3's `where: { done: false }` + Task 7's optimistic-removal `handleToggleDone`). All covered. The rollout plan's one-line Matrix description ("quadrant + unflagged views over existing Task data, desktop DnD + mobile long-press DnD") is fully covered — no schema changes were needed, matching "no CalendarEvent-style new table" expectations from the data-model notes.
- **Deliberate deviations from the mockup's literal internal wiring, not its visible behavior (same category as the design spec's own Calendar-virtualization deviation note):** the mockup's markup wires `onDragEnd` per task row; this plan uses the Tasks-phase's already-reviewed, more robust `window`-level `dragend` listener instead (catches drags abandoned outside any valid drop target, which a per-row `onDragEnd` also would, but centralizing it in one place matches the pattern this codebase already settled on and review-approved). The mockup's quadrant/unflagged box tint colors are inline JS-computed styles with no literal values in the checked-in mockup file to copy — this plan uses this app's own already-established `color-mix(...)` convention from `task-card.tsx` at reasonable percentages, flagged as a best-effort match to adjust visually if needed.
- **Type consistency check:** `TaskDTO` (Task 1, moved to `app/lib/task-dto.ts`) is the one definition every file in this plan imports (directly or via `./queries`'s re-export) — Task 3's `getMatrixTasks`, Task 4's `groupTasksByPriority`, Task 5's `MatrixTaskRow`, Task 6's panels, and Task 7's `MatrixBoard` never redefine it. `MatrixGroups`'s five keys (Task 4) exactly match `QUADRANT_KEYS` (Task 7) plus `unflagged`, and `QUADRANT_INFO`'s keys (Task 6) exactly match the four `Priority` enum values. The `data-quad` attribute values (`RED`/`AMBER`/`BLUE`/`GREEN`/`none`, set in Task 6) are read back verbatim by Task 8's `handleTaskTouchMove` hit-testing and by every `matrix-board.test.tsx` selector across Tasks 7–9 — verified to match the mockup's own `data-quad="{{ q.key }}"` / `data-quad="none"` scheme exactly.
- **Known-good testability, verified rather than assumed:** unlike the Tasks-phase plan (which wrongly assumed `DragEvent`/`DataTransfer` made drag-and-drop untestable, and shipped an untested self-drop bug as a direct result — caught only at the final whole-branch review), every testing technique this plan depends on (`fireEvent.touchStart/Move/End`, `document.elementFromPoint` direct reassignment, `navigator.vibrate` via `Object.defineProperty`, `vi.stubGlobal('matchMedia', ...)`, and the `useSyncExternalStore`-over-`useEffect` fix for the `react-hooks/set-state-in-effect` rule) was spiked against this exact project's vitest/jsdom/ESLint setup before this plan was written, with real command output confirming each one works. No task in this plan defers its own drag/touch logic to "manual verification only."
- **Lesson applied from the start, not deferred to a post-merge fix:** every optimistic mutation in `matrix-board.tsx` (Task 7) reverts on failure and alerts the user, from its first version — the Tasks phase shipped its kanban board with zero error handling and had to fix this in a dedicated post-review pass. This plan's Global Constraints restate the rule so it isn't re-learned a third time in the Calendar phase.
- **Whole-branch review (post-Task-10, on Opus): 5 Important findings, all fixed before merge.** Per-task reviews are scoped gates and don't catch cross-task or systemic issues — again, exactly what the final broad review is for, same as the Tasks phase.
  1. `reorderTasks` (Task 2's own revalidation task, a Tasks-phase action Matrix depends on) was correctly excluded from `/matrix` revalidation on the stated grounds that it "only changes `order`/`listId` — neither Matrix-visible." That reasoning missed that Matrix's own mutations (`applyPriorityChange`, `handleSaveDialog`) *write back* a task's `listId` unchanged from whatever `/matrix` last fetched — so a cross-list move made on `/tasks` could be silently reverted by a later drag on a stale `/matrix` tab. Fixed by adding the missing `revalidatePath('/matrix')`. **Plan-authoring lesson:** "Matrix-visible field" should mean any field the page reads *or writes back*, not just any field it renders — a narrower `setTaskPriority(id, priority)` action (instead of Matrix round-tripping a whole `updateTask` payload it didn't author) would close this entire category and is worth considering for a future phase.
  2. `matrix-board.tsx`'s mobile drag called `event.preventDefault()` inside a JSX `onTouchMove` handler to suppress native scrolling while dragging — a no-op, since React 19 (this project's version, confirmed) registers root-level `touchmove` listeners as passive, a documented change since React 17. This was invisible to every jsdom test (which doesn't model passive-listener/scroll semantics at all) and the plan itself had flagged the whole area as "zero verification beyond jsdom" without realizing this specific mechanism would actually fail, not just be unverified. Fixed with a native, non-passive `document.addEventListener('touchmove', ..., { passive: false })` attached only while a drag is engaged. **Plan-authoring lesson:** when a feature depends on `preventDefault()` inside a framework's synthetic touch/wheel handler, check whether that framework registers the listener as passive by default before assuming the call does anything — "jsdom can't verify this" and "this code doesn't work at all" are different claims, and only real-device testing (or checking the framework's own source/changelog, as done here after the fact) distinguishes them.
  3. A direct consequence of #2: since scroll-suppression never engaged, a synthesized `click` following a touch-drop could land on a different task than the one dragged and pop its dialog open. Fixed with a short-lived "just finished a drag" ref checked in `handleOpenTask`.
  4. Task 8 (mobile long-press) and Task 9 (responsive tab switcher) were each internally correct and individually reviewed clean, but never cross-checked against each other: at ≤860px, the tab switcher shows only one of the quadrant grid / Unflagged panel at a time, which makes the primary mobile drag flow (Unflagged → a quadrant, or back) physically impossible, since source and destination can't both be on screen. Fixed by showing both panels for the duration of an engaged touch-drag, regardless of which tab is active. **Plan-authoring lesson:** two features that are each correct in isolation can still combine into a broken flow — this is exactly the class of bug a whole-branch review exists to catch that per-task review cannot, since each task's reviewer only sees that one task's diff.
  5. Neither desktop nor mobile drag gave any visual indication of the current drop target (mobile's `touchHoverTarget` was computed for hit-testing and then never used for display; desktop's `onDragOver` only ever called `preventDefault()`). Fixed with a shared highlight (stronger border + a subtle box-shadow ring) driven by a new desktop `dragOverTarget` state and the already-existing mobile `touchHoverTarget`, so both input methods share one visual language.
  - **Minor findings deferred to future phases, not fixed now (documented so they aren't silently lost):** `taskToDialogValues`/`parseDueTime` are byte-for-byte duplicated between `app/(app)/tasks/tasks-board.tsx` and `app/(app)/matrix/matrix-board.tsx` — Task 1 existed specifically to kill this class of duplication for `serializeTask`/`formatDueLabel`, so a third copy (after the Tasks-phase board's own) is the obvious next extraction, and the Calendar phase will want it too; client components (`matrix-board.tsx`, `matrix-task-row.tsx`, the panels, `matrix-groups.ts`) import `TaskDTO` from `./queries` (which starts with `import 'server-only'`) rather than from `@/app/lib/task-dto` directly — harmless today since the import is type-only and erased, but a landmine for the day a client file needs a value import from `./queries`; `useMediaQuery`'s `getSnapshot` constructs a new `MediaQueryList` on every call rather than caching one per query; a handful of `document.elementFromPoint`/`navigator.vibrate` test-global reassignments have no explicit restore (harmless today since vitest gives each file its own jsdom, but fragile as these files grow); revert-on-failure is tested only for the drag path, not `handleToggleDone`/`handleDeleteFromDialog`'s identical revert+alert logic; task rows remain non-focusable `div`s with no keyboard path to open a task, matching (not regressing) the existing `TaskCard` pattern — flagged again so it isn't repeated a third time in Calendar.
