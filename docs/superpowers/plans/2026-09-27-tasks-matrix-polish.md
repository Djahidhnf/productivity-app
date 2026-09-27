# Tasks & Matrix Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completed tasks collapse into a per-list "Completed" dropdown and are deleted 72h after completion; priorities become red/yellow/blue/green; matrix quadrants get a solid colored header band.

**Architecture:** A nullable `Task.completedAt` column is set/cleared by `toggleTaskDone`. A `purgeExpiredTasks()` helper runs at the top of every task-reading query (lazy purge, no scheduler). The UI changes are confined to `TaskListColumn`, `QuadrantPanel`, `priority-flag.tsx` and the Still color tokens.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma 7 + PostgreSQL, Vitest + Testing Library.

Spec: `docs/superpowers/specs/2026-09-27-tasks-matrix-polish-design.md`

## Global Constraints

- Purge window: exactly 72 hours after `completedAt` (`completedAt < now - 72h` is deleted).
- Existing done tasks are backfilled with `completedAt = now()` at migration time.
- The `Priority` enum keeps `RED | AMBER | BLUE | GREEN`; `AMBER` is displayed as yellow. No data migration for priorities.
- Completed dropdown: collapsed by default, hidden when there are no done tasks, done tasks newest-completed first, not draggable, state not persisted.
- Header band text is white, except on yellow (`AMBER`) where it is dark.
- Calendar keeps showing done tasks; Matrix keeps excluding them (it already does: `getMatrixTasks` filters `done: false`).
- Before starting: the working tree has uncommitted dashboard work that also touches `app/(app)/tasks/actions.ts`. It must be committed (or otherwise settled) first so this plan's commits contain only this plan's changes. Stage files by explicit path in every commit.
- Every commit message ends with the session's `Co-Authored-By` / `Claude-Session` trailer lines.
- Unit tests: `npm test`. Integration tests (need the dev DB): `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`.

---

### Task 1: `completedAt` column, DTO field, and toggle behavior

**Files:**
- Modify: `prisma/schema.prisma` (model `Task`)
- Create: `prisma/migrations/20260927120000_task_completed_at/migration.sql`
- Modify: `app/lib/task-dto.ts`
- Modify: `app/(app)/tasks/actions.ts` (`toggleTaskDone`)
- Modify: `app/(app)/tasks/tasks-board.tsx` (`handleToggleDone`)
- Test: `app/(app)/tasks/actions.integration.test.ts`
- Modify: every test fixture that builds a `TaskDTO` literal (found via `tsc`)

**Interfaces:**
- Produces: `TaskDTO.completedAt: string | null` (ISO timestamp). `serializeTask` accepts `completedAt: Date | null`.

- [ ] **Step 1: Write the failing integration test**

In `app/(app)/tasks/actions.integration.test.ts`, add after the `'createTask, updateTask, toggleTaskDone, deleteTask round-trip'` test:

```ts
  test('toggleTaskDone stamps completedAt when completing and clears it when reopening', async () => {
    const list = await createList('ActionTest Completed');
    const task = await createTask({ text: 'ActionTest completed', listId: list.id });
    expect(task.completedAt).toBeNull();

    const before = Date.now();
    const done = await toggleTaskDone(task.id);
    expect(done.done).toBe(true);
    expect(done.completedAt).not.toBeNull();
    expect(new Date(done.completedAt!).getTime()).toBeGreaterThanOrEqual(before - 1000);

    const reopened = await toggleTaskDone(task.id);
    expect(reopened.done).toBe(false);
    expect(reopened.completedAt).toBeNull();

    await prisma.taskList.delete({ where: { id: list.id } });
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "app/(app)/tasks/actions.integration.test.ts" -t "completedAt"`
Expected: FAIL (`completedAt` is `undefined`, not `null`).

- [ ] **Step 3: Add the column and migration**

In `prisma/schema.prisma`, inside `model Task`, after `done        Boolean   @default(false)` add:

```prisma
  /// When the task was last marked done; null while open. Done tasks are purged 72h after this.
  completedAt DateTime?
```

Create `prisma/migrations/20260927120000_task_completed_at/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill: existing done tasks start their 72h purge clock now.
UPDATE "tasks" SET "completedAt" = CURRENT_TIMESTAMP WHERE "done" = true;
```

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: "1 migration applied" (or "All migrations have been successfully applied") and the client regenerated.

- [ ] **Step 4: Add the DTO field**

In `app/lib/task-dto.ts`:
- Add `completedAt: string | null;` to `interface TaskDTO` after `done: boolean;`.
- Add `completedAt: Date | null;` to the `serializeTask` parameter type after `done: boolean;`.
- Add `completedAt: task.completedAt ? task.completedAt.toISOString() : null,` to the returned object after `done: task.done,`.

- [ ] **Step 5: Stamp/clear in `toggleTaskDone`**

In `app/(app)/tasks/actions.ts`, replace the update line in `toggleTaskDone`:

```ts
  const done = !existing.done;
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { done, completedAt: done ? new Date() : null },
  });
```

- [ ] **Step 6: Mirror it in the Tasks board's optimistic update**

In `app/(app)/tasks/tasks-board.tsx`, `handleToggleDone`, replace the `setLists` mapper:

```ts
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        tasks: list.tasks.map((t) =>
          t.id === taskId ? { ...t, done: !t.done, completedAt: t.done ? null : new Date().toISOString() } : t
        ),
      }))
    );
```

- [ ] **Step 7: Fix fixtures flagged by the typecheck**

Run: `npx tsc --noEmit`
Expected: errors of the form `Property 'completedAt' is missing in type ... but required in type 'TaskDTO'` in test files (and any non-test file building a `TaskDTO` literal, e.g. optimistic "create" objects in boards).

For each reported location, add `completedAt: null,` next to the `done:` property of the literal (use `completedAt: '2026-09-27T10:00:00.000Z',` only where the fixture has `done: true` and the test cares about ordering; otherwise `null` is fine). Re-run `npx tsc --noEmit` until it prints nothing.

- [ ] **Step 8: Run the tests**

Run: `npx vitest run "app/(app)/tasks/actions.integration.test.ts"` then `npm test`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260927120000_task_completed_at app/lib/task-dto.ts "app/(app)/tasks/actions.ts" "app/(app)/tasks/tasks-board.tsx" "app/(app)/tasks/actions.integration.test.ts"
# plus every fixture file edited in Step 7, by path
git commit -m "feat: record when a task is completed"
```

---

### Task 2: Purge done tasks 72h after completion

**Files:**
- Create: `app/lib/task-purge.ts`
- Create: `app/lib/task-purge.integration.test.ts`
- Modify: `app/(app)/tasks/queries.ts`, `app/(app)/matrix/queries.ts`, `app/(app)/calendar/queries.ts`, `app/(app)/dashboard/queries.ts`

**Interfaces:**
- Consumes: `Task.completedAt` (Task 1).
- Produces: `purgeExpiredTasks(now?: Date): Promise<number>` (returns the deleted count); `COMPLETED_TASK_TTL_MS = 72 * 60 * 60 * 1000`.

- [ ] **Step 1: Write the failing integration test**

Create `app/lib/task-purge.integration.test.ts`:

```ts
/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach } from 'vitest';
import { prisma } from '@/app/lib/prisma';
import { purgeExpiredTasks, COMPLETED_TASK_TTL_MS } from './task-purge';

const HOUR = 60 * 60 * 1000;

describe('purgeExpiredTasks', () => {
  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'PurgeTest ' } } });
    await prisma.taskList.deleteMany({ where: { name: { startsWith: 'PurgeTest ' } } });
  });

  test('deletes tasks completed more than 72h ago and keeps everything else', async () => {
    expect(COMPLETED_TASK_TTL_MS).toBe(72 * HOUR);
    const now = new Date('2026-09-27T12:00:00.000Z');
    const list = await prisma.taskList.create({ data: { name: 'PurgeTest list', order: 9999 } });
    const make = (text: string, done: boolean, completedAt: Date | null) =>
      prisma.task.create({ data: { text, listId: list.id, order: 0, done, completedAt } });

    const expired = await make('PurgeTest expired', true, new Date(now.getTime() - 73 * HOUR));
    const recent = await make('PurgeTest recent', true, new Date(now.getTime() - 71 * HOUR));
    const open = await make('PurgeTest open', false, null);

    const deleted = await purgeExpiredTasks(now);
    expect(deleted).toBeGreaterThanOrEqual(1);

    expect(await prisma.task.findUnique({ where: { id: expired.id } })).toBeNull();
    expect(await prisma.task.findUnique({ where: { id: recent.id } })).not.toBeNull();
    expect(await prisma.task.findUnique({ where: { id: open.id } })).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/lib/task-purge.integration.test.ts`
Expected: FAIL (cannot resolve `./task-purge`).

- [ ] **Step 3: Implement the helper**

Create `app/lib/task-purge.ts`:

```ts
import 'server-only';
import { prisma } from '@/app/lib/prisma';

/** Done tasks are deleted this long after they were completed. */
export const COMPLETED_TASK_TTL_MS = 72 * 60 * 60 * 1000;

/**
 * Deletes done tasks completed more than 72h before `now`. Called lazily at
 * the top of every task-reading query instead of on a schedule, so expired
 * tasks vanish the next time any task page loads.
 */
export async function purgeExpiredTasks(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.task.deleteMany({
    where: { done: true, completedAt: { lt: new Date(now.getTime() - COMPLETED_TASK_TTL_MS) } },
  });
  return count;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run app/lib/task-purge.integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Call it from every task-reading query**

In each of these four files add `import { purgeExpiredTasks } from '@/app/lib/task-purge';` and insert `await purgeExpiredTasks();` on the line right after `await verifySession();` in the named function:

- `app/(app)/tasks/queries.ts` → `getTaskLists`
- `app/(app)/matrix/queries.ts` → `getMatrixTasks`
- `app/(app)/calendar/queries.ts` → `getCalendarTasks`
- `app/(app)/dashboard/queries.ts` → `getDashboardTasks`

- [ ] **Step 6: Run the query integration tests**

Run: `npx vitest run "app/(app)/tasks/queries.integration.test.ts" "app/(app)/matrix/queries.integration.test.ts" "app/(app)/calendar/queries.integration.test.ts" "app/(app)/dashboard/queries.integration.test.ts"`
Expected: all PASS. (If a test seeds a `done: true` task, its `completedAt` is null, so the purge leaves it alone.)

- [ ] **Step 7: Commit**

```bash
git add app/lib/task-purge.ts app/lib/task-purge.integration.test.ts "app/(app)/tasks/queries.ts" "app/(app)/matrix/queries.ts" "app/(app)/calendar/queries.ts" "app/(app)/dashboard/queries.ts"
git commit -m "feat: delete completed tasks 72 hours after completion"
```

---

### Task 3: Completed dropdown in each list column

**Files:**
- Modify: `app/(app)/tasks/task-list-column.tsx`
- Modify: `app/styles/layout.css` (append to the Tasks section)
- Test: `app/(app)/tasks/task-list-column.test.tsx`

**Interfaces:**
- Consumes: `TaskDTO.completedAt` (Task 1).
- Produces: nothing new for other tasks; `TaskListColumnProps` is unchanged.

- [ ] **Step 1: Write the failing tests**

In `app/(app)/tasks/task-list-column.test.tsx`, add a helper below `makeList` and new tests inside the `describe`:

```tsx
function task(overrides: Partial<TaskDTO>): TaskDTO {
  return { id: 'x', text: 'x', listId: 'list1', priority: null, due: null, dueTime: null, duration: 60, done: false, completedAt: null, order: 0, ...overrides };
}
```

(Also change the import to `import type { TaskDTO, TaskListDTO } from './queries';`.)

```tsx
  test('hides the Completed toggle when no task is done', () => {
    render(<TaskListColumn list={makeList()} {...noop} />);
    expect(screen.queryByRole('button', { name: /Completed/ })).not.toBeInTheDocument();
  });

  test('done tasks are collapsed under a Completed toggle and the header counts open tasks only', () => {
    const list = makeList({
      tasks: [
        task({ id: 'a', text: 'Open one' }),
        task({ id: 'b', text: 'Finished one', done: true, completedAt: '2026-09-26T08:00:00.000Z' }),
      ],
    });
    render(<TaskListColumn list={list} {...noop} />);
    expect(screen.getByText('Open one')).toBeInTheDocument();
    expect(screen.queryByText('Finished one')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Completed (1)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('heading', { name: /Work/ })).toHaveTextContent('Work1');
  });

  test('expanding Completed lists done tasks newest-completed first', async () => {
    const list = makeList({
      tasks: [
        task({ id: 'old', text: 'Done Monday', done: true, completedAt: '2026-09-21T08:00:00.000Z' }),
        task({ id: 'new', text: 'Done Friday', done: true, completedAt: '2026-09-25T08:00:00.000Z' }),
      ],
    });
    render(<TaskListColumn list={list} {...noop} />);
    await userEvent.click(screen.getByRole('button', { name: 'Completed (2)' }));
    expect(screen.getByRole('button', { name: 'Completed (2)' })).toHaveAttribute('aria-expanded', 'true');
    const friday = screen.getByText('Done Friday');
    const monday = screen.getByText('Done Monday');
    expect(friday.compareDocumentPosition(monday) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('done tasks in the dropdown are not draggable', async () => {
    const list = makeList({ tasks: [task({ id: 'd', text: 'Finished', done: true, completedAt: '2026-09-26T08:00:00.000Z' })] });
    render(<TaskListColumn list={list} {...noop} />);
    await userEvent.click(screen.getByRole('button', { name: 'Completed (1)' }));
    expect(screen.getByText('Finished').closest('.st-row')).not.toHaveAttribute('draggable', 'true');
  });
```

Also update the existing `makeList` fixture task to include `completedAt: null` if Task 1 Step 7 did not already.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run "app/(app)/tasks/task-list-column.test.tsx"`
Expected: the new tests FAIL (no "Completed" button; done task is visible).

- [ ] **Step 3: Implement the dropdown**

In `app/(app)/tasks/task-list-column.tsx`:

Add state next to `draft`:

```tsx
  const [completedOpen, setCompletedOpen] = useState(false);
```

Replace `const openCount = list.tasks.filter((t) => !t.done).length;` with:

```tsx
  const openTasks = list.tasks.filter((t) => !t.done);
  // Newest-completed first; tasks without a timestamp sort last.
  const doneTasks = list.tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const openCount = openTasks.length;
```

Replace the body of the `pw-tasks-scroll` div (the `list.tasks.map(...)` and the empty-state line) with:

```tsx
        {openTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleDone={onToggleDone}
            onOpen={onOpenTask}
            draggable
            onDragStart={() => onTaskDragStart(task)}
            onDragOver={allowDrop}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onTaskDrop(list.id, task.id);
            }}
          />
        ))}
        {openTasks.length === 0 && <p className="st-empty">Nothing here.</p>}
        {doneTasks.length > 0 && (
          <>
            <button
              type="button"
              className="pw-completed-toggle"
              aria-expanded={completedOpen}
              onClick={() => setCompletedOpen((open) => !open)}
            >
              <Icon name="right" size={14} />
              Completed ({doneTasks.length})
            </button>
            {completedOpen &&
              doneTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggleDone={onToggleDone} onOpen={onOpenTask} />
              ))}
          </>
        )}
```

- [ ] **Step 4: Style the toggle**

Append to the Tasks section of `app/styles/layout.css`:

```css
.pw-completed-toggle { flex: none; display: flex; align-items: center; gap: 6px; margin: 12px 0 4px; padding: 4px 0; appearance: none; border: none; background: transparent; color: var(--fg-3); font: inherit; font-size: var(--text-xs); font-weight: 500; cursor: pointer; text-align: left; }
.pw-completed-toggle:hover { color: var(--fg-2); }
.pw-completed-toggle svg { transition: transform var(--dur-base) var(--ease-out); }
.pw-completed-toggle[aria-expanded="true"] svg { transform: rotate(90deg); }
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run "app/(app)/tasks/task-list-column.test.tsx" "app/(app)/tasks/tasks-board.test.tsx"`
Expected: PASS. If a `tasks-board` test asserted a done task is visible in its column, update it to click `Completed (n)` first.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/tasks/task-list-column.tsx" "app/(app)/tasks/task-list-column.test.tsx" app/styles/layout.css
# plus tasks-board.test.tsx if Step 5 changed it
git commit -m "feat: collapse completed tasks into a dropdown under each list"
```

Note: if `app/styles/layout.css` still has unrelated uncommitted edits (the precondition in Global Constraints was not met), stop and ask before committing rather than sweeping them into this commit.

---

### Task 4: Red / yellow / blue / green priority colors

**Files:**
- Modify: `app/styles/still/tokens/colors.css`
- Modify: `app/components/ui/priority-flag.tsx`
- Test: `app/styles/tokens.test.ts`, create `app/components/ui/priority-flag.test.tsx`

**Interfaces:**
- Produces: CSS tokens `--prio-red`, `--prio-yellow`, `--prio-blue`, `--prio-green`, `--prio-on-dark`, `--prio-on-light`. `PRIORITY_COLORS: Record<PriorityKey, string>` (unchanged shape, new values). New `PRIORITY_ON_COLORS: Record<PriorityKey, string>` (text color to use on a solid priority fill).

- [ ] **Step 1: Write the failing tests**

Add to `app/styles/tokens.test.ts` inside the `describe`:

```ts
  test('colors.css defines vivid priority hues for light and dark themes', () => {
    const css = readFileSync(path.join(stylesDir, 'tokens/colors.css'), 'utf-8');
    for (const name of ['red', 'yellow', 'blue', 'green']) {
      expect(css.match(new RegExp(`--prio-${name}:`, 'g'))?.length).toBe(2);
    }
  });
```

Create `app/components/ui/priority-flag.test.tsx`:

```tsx
import { describe, test, expect } from 'vitest';
import { PRIORITY_COLORS, PRIORITY_ON_COLORS } from './priority-flag';

describe('priority colors', () => {
  test('map the four priorities to red, yellow, blue and green', () => {
    expect(PRIORITY_COLORS).toEqual({
      RED: 'var(--prio-red)',
      AMBER: 'var(--prio-yellow)',
      BLUE: 'var(--prio-blue)',
      GREEN: 'var(--prio-green)',
    });
  });

  test('use dark text on yellow and white text on the others', () => {
    expect(PRIORITY_ON_COLORS).toEqual({
      RED: 'var(--prio-on-dark)',
      AMBER: 'var(--prio-on-light)',
      BLUE: 'var(--prio-on-dark)',
      GREEN: 'var(--prio-on-dark)',
    });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run app/styles/tokens.test.ts app/components/ui/priority-flag.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add the tokens**

In `app/styles/still/tokens/colors.css`, add inside the first `:root{ ... }` block (just before its closing `}` at line 43):

```css
/* Priority — vivid, deliberately outside the low-chroma palette. */
--prio-red:oklch(58% 0.19 27);--prio-yellow:oklch(85% 0.16 92);--prio-blue:oklch(57% 0.15 252);--prio-green:oklch(58% 0.14 150);
--prio-on-dark:oklch(99% 0 0);--prio-on-light:oklch(24% 0.03 80);
```

Add inside the `[data-theme="dark"]{ ... }` block (before its closing `}`):

```css
--prio-red:oklch(64% 0.18 27);--prio-yellow:oklch(84% 0.15 92);--prio-blue:oklch(64% 0.14 252);--prio-green:oklch(64% 0.13 150);
```

- [ ] **Step 4: Point the priority maps at them**

Replace the top of `app/components/ui/priority-flag.tsx` (the comment and `PRIORITY_COLORS`) with:

```tsx
// Vivid priority hues: red (do first), yellow (schedule), blue (delegate),
// green (eliminate). The AMBER enum value is displayed as yellow.
export const PRIORITY_COLORS = {
  RED: 'var(--prio-red)',
  AMBER: 'var(--prio-yellow)',
  BLUE: 'var(--prio-blue)',
  GREEN: 'var(--prio-green)',
} as const;

/** Text color to use on a solid PRIORITY_COLORS fill. Yellow is too light for white. */
export const PRIORITY_ON_COLORS = {
  RED: 'var(--prio-on-dark)',
  AMBER: 'var(--prio-on-light)',
  BLUE: 'var(--prio-on-dark)',
  GREEN: 'var(--prio-on-dark)',
} as const;
```

Leave `PriorityKey` and `PriorityFlag` as they are.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: all PASS (no other test asserts the old `--clay-500` / `--amber-500` / `--mist-500` / `--gray-400` priority values; if one does, update its expectation to the new token).

- [ ] **Step 6: Commit**

```bash
git add app/styles/still/tokens/colors.css app/components/ui/priority-flag.tsx app/components/ui/priority-flag.test.tsx app/styles/tokens.test.ts
git commit -m "feat: use red, yellow, blue and green for task priorities"
```

---

### Task 5: Matrix quadrant header band

**Files:**
- Modify: `app/(app)/matrix/quadrant-panel.tsx`
- Test: `app/(app)/matrix/quadrant-panel.test.tsx`

**Interfaces:**
- Consumes: `PRIORITY_COLORS`, `PRIORITY_ON_COLORS` (Task 4).

- [ ] **Step 1: Write the failing test**

Add to `app/(app)/matrix/quadrant-panel.test.tsx`:

```tsx
  test('the header is a solid band in the quadrant color with contrasting text', () => {
    render(
      <QuadrantPanel priorityKey="AMBER" tasks={[makeTask({ priority: 'AMBER' })]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    const band = screen.getByText('Schedule').closest('[data-quad-header]') as HTMLElement;
    expect(band).not.toBeNull();
    expect(band.style.background).toBe('var(--prio-yellow)');
    expect(band.style.color).toBe('var(--prio-on-light)');
    expect(band).toHaveTextContent('Not urgent but important');
    expect(band).toHaveTextContent('1');
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "app/(app)/matrix/quadrant-panel.test.tsx"`
Expected: FAIL (`band` is null).

- [ ] **Step 3: Implement the band**

In `app/(app)/matrix/quadrant-panel.tsx`:

Change the import to:

```tsx
import { PRIORITY_COLORS, PRIORITY_ON_COLORS, type PriorityKey } from '@/app/components/ui/priority-flag';
```

After `const color = PRIORITY_COLORS[priorityKey];` add:

```tsx
  const onColor = PRIORITY_ON_COLORS[priorityKey];
```

Replace the outer container's `style` object with:

```tsx
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${isDropTarget ? color : `color-mix(in oklch, ${color} 35%, var(--border-1))`}`,
        background: isDropTarget ? `color-mix(in oklch, ${color} 8%, var(--surface-1))` : 'var(--surface-1)',
        boxShadow: isDropTarget ? `0 0 0 3px color-mix(in oklch, ${color} 25%, transparent)` : undefined,
        transition: 'background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
      }}
```

Replace the header `<div>` (the one containing the 8×8 square, title, subtitle and count) with:

```tsx
      <div
        data-quad-header
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', flex: 'none', background: color, color: onColor }}
      >
        <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', whiteSpace: 'nowrap' }}>{title}</span>
        <span className="pw-quad-subtitle" style={{ fontSize: 'var(--text-sm)', opacity: 0.85, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>
        <span
          style={{
            marginLeft: 'auto',
            minWidth: 22,
            padding: '1px 7px',
            borderRadius: 999,
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            background: `color-mix(in oklch, ${onColor} 20%, transparent)`,
          }}
        >
          {tasks.length}
        </span>
      </div>
```

Change the task list container's padding from `'0 16px 12px'` to `'8px 16px 12px'` so the first row doesn't touch the band.

- [ ] **Step 4: Run the matrix tests**

Run: `npx vitest run "app/(app)/matrix"` (unit files only run; integration files need the DB and also pass)
Expected: all PASS.

- [ ] **Step 5: Typecheck, full suite, and eyeball it**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: no type errors, all tests PASS, no lint errors.

Then `npm run dev`, open `/matrix` in light and dark themes and at ~400px width: each quadrant shows a solid red/yellow/blue/green band; yellow has dark text; dropping a task rings the target quadrant. Open `/tasks`: completing a task moves it under `Completed (n)`.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/matrix/quadrant-panel.tsx" "app/(app)/matrix/quadrant-panel.test.tsx"
git commit -m "feat: give matrix quadrants a solid colored header band"
```
