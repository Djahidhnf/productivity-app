# Daybook Tasks Phase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Tasks screen — a horizontally-scrollable kanban board of `TaskList` columns containing draggable `Task` cards, with full create/read/update/delete/reorder, replacing the `/tasks` stub page.

**Architecture:** Server Components fetch data (`queries.ts`); Server Actions mutate it (`actions.ts`, each independently re-verifying the session per the foundation's global constraint); a client-side `TasksBoard` owns optimistic UI state and calls the actions. Drag-and-drop reordering math is extracted into pure, directly-unit-tested functions (`task-reorder.ts`) because jsdom cannot simulate real HTML5 `DragEvent`/`DataTransfer` — the reorder *logic* is fully tested even though the drag *gesture* itself isn't.

**Tech Stack:** Next.js 16 Server Components/Actions, Prisma 7 (already wired), React 19 `useTransition`, Vitest + React Testing Library, the shared UI primitives and design-system CSS from the foundation phase.

## Global Constraints

- Single-user app — no `userId` anywhere, no auth beyond the existing session.
- Every Server Action must call `verifySession()` from `@/app/lib/dal` before touching data (already-established pattern; re-verify per action, don't rely on the layout's check).
- Import alias `@/*` maps to the repo root.
- Design tokens/colors/radii come from the already-wired CSS custom properties (`var(--accent)`, `var(--radius-md)`, etc.) and the already-copied `.pw-board`/`.pw-list-col`/`.pw-scroll`/`.pw-two` classes in `app/styles/layout.css` — reuse them, don't reinvent kanban-scrolling CSS.
- Eisenhower quadrant is the single `Priority` enum (`RED | AMBER | BLUE | GREEN | null`) already on `Task` — never two booleans.
- No placeholders, no TODOs — every task ships working, tested code.
- Deliberate scope decision for this phase: mobile touch drag-and-drop (long-press based, since native HTML5 DnD doesn't fire on touch) is **not** built here — desktop drag-and-drop only. Mobile users get full CRUD via the task dialog (which every card's click already opens) but not touch-reordering. This mirrors how the design spec explicitly deferred the Eisenhower Matrix's touch DnD to its own phase; the same deferral applies here for the same reason (it's a substantial, separable feature). Flag this clearly rather than silently shipping half of it.
- Deliberate scope decision: the mockup's click-and-drag-to-pan horizontal scrolling on the board (`onMouseDown` capturing a manual scroll drag) is not built — native scrolling (trackpad, shift+wheel, touch swipe, scrollbar) already satisfies "horizontally-scrollable columns" functionally. Click-to-pan is pure polish, not a functional requirement.

---

## Task 1: Task/TaskList data queries

**Files:**
- Create: `app/(app)/tasks/queries.ts`
- Test: `app/(app)/tasks/queries.integration.test.ts`

**Interfaces:**
- Produces: `TaskDTO { id, text, listId, priority: 'RED'|'AMBER'|'BLUE'|'GREEN'|null, due: string|null, dueTime: number|null, duration: number, done: boolean, order: number }`, `TaskListDTO { id, name, order, tasks: TaskDTO[] }`, and `getTaskLists(): Promise<TaskListDTO[]>` (lists ordered by `order`, each list's tasks ordered by `order`). `due` is serialized to a plain `'YYYY-MM-DD'` string (or `null`), never a `Date` object, so every downstream client component works with plain strings.

- [ ] **Step 1: Write the failing integration test**

Create `app/(app)/tasks/queries.integration.test.ts`:
```ts
import { describe, test, expect, afterEach } from 'vitest';
import { prisma } from '@/app/lib/prisma';
import { getTaskLists } from './queries';

describe('getTaskLists', () => {
  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'QueryTest ' } } });
    await prisma.taskList.deleteMany({ where: { name: { startsWith: 'QueryTest ' } } });
  });

  test('returns lists ordered by order, each with its tasks ordered by order, due serialized as a date string', async () => {
    const listB = await prisma.taskList.create({ data: { name: 'QueryTest B', order: 1 } });
    const listA = await prisma.taskList.create({ data: { name: 'QueryTest A', order: 0 } });

    await prisma.task.create({ data: { text: 'QueryTest second', listId: listA.id, order: 1 } });
    await prisma.task.create({
      data: { text: 'QueryTest first', listId: listA.id, order: 0, due: new Date('2026-03-01'), priority: 'RED' },
    });

    const result = await getTaskLists();
    const a = result.find((l) => l.id === listA.id)!;
    const b = result.find((l) => l.id === listB.id)!;

    expect(result.indexOf(a)).toBeLessThan(result.indexOf(b));
    expect(a.tasks.map((t) => t.text)).toEqual(['QueryTest first', 'QueryTest second']);
    expect(a.tasks[0].due).toBe('2026-03-01');
    expect(a.tasks[0].priority).toBe('RED');
    expect(a.tasks[1].due).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(app\)/tasks/queries.integration.test.ts`
Expected: FAIL — `Cannot find module './queries'`. (Requires a reachable Postgres at `DATABASE_URL`; see the foundation plan's Task 3 for setup.)

- [ ] **Step 3: Write the implementation**

Create `app/(app)/tasks/queries.ts`:
```ts
import { prisma } from '@/app/lib/prisma';
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

export interface TaskListDTO {
  id: string;
  name: string;
  order: number;
  tasks: TaskDTO[];
}

function toDateKey(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export async function getTaskLists(): Promise<TaskListDTO[]> {
  const lists = await prisma.taskList.findMany({
    orderBy: { order: 'asc' },
    include: { tasks: { orderBy: { order: 'asc' } } },
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    order: list.order,
    tasks: list.tasks.map((task) => ({
      id: task.id,
      text: task.text,
      listId: task.listId,
      priority: task.priority,
      due: toDateKey(task.due),
      dueTime: task.dueTime,
      duration: task.duration,
      done: task.done,
      order: task.order,
    })),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/\(app\)/tasks/queries.integration.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/queries.ts" "app/(app)/tasks/queries.integration.test.ts"
git commit -m "feat: add Task/TaskList data queries"
```

---

## Task 2: Task/TaskList Server Actions

**Files:**
- Create: `app/(app)/tasks/actions.ts`
- Test: `app/(app)/tasks/actions.integration.test.ts`

**Interfaces:**
- Consumes: `TaskDTO`, `TaskListDTO` (types only) from `./queries` (Task 1); `verifySession` from `@/app/lib/dal`.
- Produces (all exported async functions, all call `verifySession()` first, all call `revalidatePath('/tasks')` on success):
  - `createList(name: string): Promise<{ id: string; name: string; order: number }>`
  - `deleteList(listId: string): Promise<void>`
  - `reorderLists(orderedIds: string[]): Promise<void>`
  - `createTask(input: { text: string; listId: string }): Promise<TaskDTO>`
  - `updateTask(input: { id: string; text: string; listId: string; priority: Priority | null; due: string | null; dueTime: number | null }): Promise<TaskDTO>`
  - `deleteTask(taskId: string): Promise<void>`
  - `toggleTaskDone(taskId: string): Promise<TaskDTO>`
  - `reorderTasks(input: { listId: string; orderedTaskIds: string[] }): Promise<void>`

- [ ] **Step 1: Write the failing integration test**

Create `app/(app)/tasks/actions.integration.test.ts`:
```ts
import { describe, test, expect, afterEach } from 'vitest';
import { prisma } from '@/app/lib/prisma';
import {
  createList,
  deleteList,
  reorderLists,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskDone,
  reorderTasks,
} from './actions';

describe('task/list server actions', () => {
  afterEach(async () => {
    await prisma.task.deleteMany({ where: { text: { startsWith: 'ActionTest ' } } });
    await prisma.taskList.deleteMany({ where: { name: { startsWith: 'ActionTest ' } } });
  });

  test('createList creates a list at the next order position', async () => {
    const before = await prisma.taskList.count();
    const list = await createList('ActionTest List');
    expect(list.name).toBe('ActionTest List');
    expect(list.order).toBe(before);
  });

  test('deleteList cascades to delete its tasks', async () => {
    const list = await createList('ActionTest Cascade');
    const task = await createTask({ text: 'ActionTest cascade task', listId: list.id });
    await deleteList(list.id);
    const found = await prisma.task.findUnique({ where: { id: task.id } });
    expect(found).toBeNull();
  });

  test('reorderLists sets each list order to its array index', async () => {
    const a = await createList('ActionTest Reorder A');
    const b = await createList('ActionTest Reorder B');
    await reorderLists([b.id, a.id]);
    const refreshedA = await prisma.taskList.findUniqueOrThrow({ where: { id: a.id } });
    const refreshedB = await prisma.taskList.findUniqueOrThrow({ where: { id: b.id } });
    expect(refreshedB.order).toBe(0);
    expect(refreshedA.order).toBe(1);
    await prisma.taskList.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  });

  test('createTask, updateTask, toggleTaskDone, deleteTask round-trip', async () => {
    const list = await createList('ActionTest CRUD');
    const created = await createTask({ text: 'ActionTest task', listId: list.id });
    expect(created.done).toBe(false);
    expect(created.priority).toBeNull();

    const updated = await updateTask({
      id: created.id,
      text: 'ActionTest task edited',
      listId: list.id,
      priority: 'AMBER',
      due: '2026-04-01',
      dueTime: 90,
    });
    expect(updated.text).toBe('ActionTest task edited');
    expect(updated.priority).toBe('AMBER');
    expect(updated.due).toBe('2026-04-01');
    expect(updated.dueTime).toBe(90);

    const toggled = await toggleTaskDone(created.id);
    expect(toggled.done).toBe(true);
    const toggledAgain = await toggleTaskDone(created.id);
    expect(toggledAgain.done).toBe(false);

    await deleteTask(created.id);
    const found = await prisma.task.findUnique({ where: { id: created.id } });
    expect(found).toBeNull();
    await prisma.taskList.delete({ where: { id: list.id } });
  });

  test('reorderTasks sets order and can move a task into a different list', async () => {
    const listA = await createList('ActionTest MoveA');
    const listB = await createList('ActionTest MoveB');
    const t1 = await createTask({ text: 'ActionTest t1', listId: listA.id });
    const t2 = await createTask({ text: 'ActionTest t2', listId: listA.id });

    await reorderTasks({ listId: listB.id, orderedTaskIds: [t2.id] });
    const movedT2 = await prisma.task.findUniqueOrThrow({ where: { id: t2.id } });
    expect(movedT2.listId).toBe(listB.id);
    expect(movedT2.order).toBe(0);

    await reorderTasks({ listId: listA.id, orderedTaskIds: [t1.id] });
    const remainingT1 = await prisma.task.findUniqueOrThrow({ where: { id: t1.id } });
    expect(remainingT1.order).toBe(0);

    await prisma.task.deleteMany({ where: { id: { in: [t1.id, t2.id] } } });
    await prisma.taskList.deleteMany({ where: { id: { in: [listA.id, listB.id] } } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(app\)/tasks/actions.integration.test.ts`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 3: Write the implementation**

Create `app/(app)/tasks/actions.ts`:
```ts
'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { Priority } from '@prisma/client';
import type { TaskDTO } from './queries';

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

export async function createList(name: string): Promise<{ id: string; name: string; order: number }> {
  await verifySession();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('List name is required');
  const count = await prisma.taskList.count();
  const list = await prisma.taskList.create({ data: { name: trimmed, order: count } });
  revalidatePath('/tasks');
  return { id: list.id, name: list.name, order: list.order };
}

export async function deleteList(listId: string): Promise<void> {
  await verifySession();
  await prisma.taskList.delete({ where: { id: listId } });
  revalidatePath('/tasks');
}

export async function reorderLists(orderedIds: string[]): Promise<void> {
  await verifySession();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.taskList.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath('/tasks');
}

export interface CreateTaskInput {
  text: string;
  listId: string;
}

export async function createTask(input: CreateTaskInput): Promise<TaskDTO> {
  await verifySession();
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error('Task text is required');
  const count = await prisma.task.count({ where: { listId: input.listId } });
  const task = await prisma.task.create({ data: { text: trimmed, listId: input.listId, order: count } });
  revalidatePath('/tasks');
  return serializeTask(task);
}

export interface UpdateTaskInput {
  id: string;
  text: string;
  listId: string;
  priority: Priority | null;
  due: string | null;
  dueTime: number | null;
}

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
  return serializeTask(task);
}

export async function deleteTask(taskId: string): Promise<void> {
  await verifySession();
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath('/tasks');
}

export async function toggleTaskDone(taskId: string): Promise<TaskDTO> {
  await verifySession();
  const existing = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const task = await prisma.task.update({ where: { id: taskId }, data: { done: !existing.done } });
  revalidatePath('/tasks');
  return serializeTask(task);
}

export interface ReorderTasksInput {
  listId: string;
  orderedTaskIds: string[];
}

export async function reorderTasks(input: ReorderTasksInput): Promise<void> {
  await verifySession();
  await prisma.$transaction(
    input.orderedTaskIds.map((id, index) =>
      prisma.task.update({ where: { id }, data: { listId: input.listId, order: index } })
    )
  );
  revalidatePath('/tasks');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/\(app\)/tasks/actions.integration.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/actions.ts" "app/(app)/tasks/actions.integration.test.ts"
git commit -m "feat: add Task/TaskList server actions"
```

---

## Task 3: Pure drag-and-drop reorder logic

**Files:**
- Create: `app/(app)/tasks/task-reorder.ts`
- Test: `app/(app)/tasks/task-reorder.test.ts`

**Interfaces:**
- Consumes: `TaskDTO`, `TaskListDTO` (types only) from `./queries` (Task 1).
- Produces: `moveTaskInLists(lists, draggedTaskId, targetListId, targetTaskId): TaskListDTO[]`, `taskIdsForList(lists, listId): string[]`, `moveListInLists(lists, draggedListId, targetListId): TaskListDTO[]` — pure functions (no side effects, no DOM), used by Task 8 (TasksBoard) to compute the new state on a drop, both for local optimistic UI and for building the `orderedTaskIds`/`orderedIds` arrays sent to Task 2's server actions.

This is the task that carries the real test weight for drag-and-drop: jsdom cannot simulate real HTML5 `DragEvent`/`DataTransfer`, so the reorder *math* is tested directly here with plain data, independent of any drag gesture simulation.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/tasks/task-reorder.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { moveTaskInLists, taskIdsForList, moveListInLists } from './task-reorder';
import type { TaskListDTO } from './queries';

function makeTask(id: string, listId: string, order: number) {
  return { id, text: id, listId, priority: null, due: null, dueTime: null, duration: 60, done: false, order };
}

function makeLists(): TaskListDTO[] {
  return [
    { id: 'listA', name: 'A', order: 0, tasks: [makeTask('t1', 'listA', 0), makeTask('t2', 'listA', 1)] },
    { id: 'listB', name: 'B', order: 1, tasks: [makeTask('t3', 'listB', 0)] },
  ];
}

describe('moveTaskInLists', () => {
  test('reorders within the same list, inserting before the target task', () => {
    const result = moveTaskInLists(makeLists(), 't2', 'listA', 't1');
    expect(taskIdsForList(result, 'listA')).toEqual(['t2', 't1']);
    expect(taskIdsForList(result, 'listB')).toEqual(['t3']);
  });

  test('appends to the end when targetTaskId is null', () => {
    const result = moveTaskInLists(makeLists(), 't1', 'listA', null);
    expect(taskIdsForList(result, 'listA')).toEqual(['t2', 't1']);
  });

  test('moves a task into a different list, updating its listId', () => {
    const result = moveTaskInLists(makeLists(), 't1', 'listB', 't3');
    expect(taskIdsForList(result, 'listA')).toEqual(['t2']);
    expect(taskIdsForList(result, 'listB')).toEqual(['t1', 't3']);
    const movedTask = result.find((l) => l.id === 'listB')!.tasks.find((t) => t.id === 't1')!;
    expect(movedTask.listId).toBe('listB');
  });

  test('appends to the end of a different list when targetTaskId is null', () => {
    const result = moveTaskInLists(makeLists(), 't1', 'listB', null);
    expect(taskIdsForList(result, 'listB')).toEqual(['t3', 't1']);
  });

  test('returns the lists unchanged if the dragged task id does not exist anywhere', () => {
    const lists = makeLists();
    const result = moveTaskInLists(lists, 'nonexistent', 'listA', null);
    expect(result).toBe(lists);
  });
});

describe('moveListInLists', () => {
  test('moves a list before the target list', () => {
    const lists = makeLists();
    const result = moveListInLists(lists, 'listB', 'listA');
    expect(result.map((l) => l.id)).toEqual(['listB', 'listA']);
  });

  test('is a no-op when dragging a list onto itself', () => {
    const lists = makeLists();
    const result = moveListInLists(lists, 'listA', 'listA');
    expect(result).toBe(lists);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(app\)/tasks/task-reorder.test.ts`
Expected: FAIL — `Cannot find module './task-reorder'`.

- [ ] **Step 3: Write the implementation**

Create `app/(app)/tasks/task-reorder.ts`:
```ts
import type { TaskListDTO } from './queries';

/**
 * Moves a task to a new position, optionally into a different list.
 * targetTaskId null means "append to the end of targetListId".
 */
export function moveTaskInLists(
  lists: TaskListDTO[],
  draggedTaskId: string,
  targetListId: string,
  targetTaskId: string | null
): TaskListDTO[] {
  const sourceList = lists.find((l) => l.tasks.some((t) => t.id === draggedTaskId));
  if (!sourceList) return lists;
  const draggedTask = sourceList.tasks.find((t) => t.id === draggedTaskId)!;

  const withoutDragged = lists.map((list) => ({
    ...list,
    tasks: list.tasks.filter((t) => t.id !== draggedTaskId),
  }));

  return withoutDragged.map((list) => {
    if (list.id !== targetListId) return list;
    const insertIndex = targetTaskId ? list.tasks.findIndex((t) => t.id === targetTaskId) : -1;
    const at = insertIndex === -1 ? list.tasks.length : insertIndex;
    const newTasks = [...list.tasks];
    newTasks.splice(at, 0, { ...draggedTask, listId: targetListId });
    return { ...list, tasks: newTasks };
  });
}

/** Returns the ordered task IDs for a single list, ready to send to reorderTasks(). */
export function taskIdsForList(lists: TaskListDTO[], listId: string): string[] {
  return lists.find((l) => l.id === listId)?.tasks.map((t) => t.id) ?? [];
}

/** Reorders the TaskList array itself (dragging a column header). */
export function moveListInLists(lists: TaskListDTO[], draggedListId: string, targetListId: string): TaskListDTO[] {
  if (draggedListId === targetListId) return lists;
  const dragged = lists.find((l) => l.id === draggedListId);
  if (!dragged) return lists;
  const without = lists.filter((l) => l.id !== draggedListId);
  const targetIndex = without.findIndex((l) => l.id === targetListId);
  const at = targetIndex === -1 ? without.length : targetIndex;
  const next = [...without];
  next.splice(at, 0, dragged);
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/\(app\)/tasks/task-reorder.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/task-reorder.ts" "app/(app)/tasks/task-reorder.test.ts"
git commit -m "feat: add pure task/list reorder logic"
```

---

## Task 4: TaskCard component

**Files:**
- Create: `app/(app)/tasks/task-card.tsx`
- Test: `app/(app)/tasks/task-card.test.tsx`

**Interfaces:**
- Consumes: `TaskDTO` (type) from `./queries` (Task 1); `CheckToggle` from `@/app/components/ui/check-toggle`; `PriorityFlag`, `PRIORITY_COLORS`, `PriorityKey` from `@/app/components/ui/priority-flag`.
- Produces: `TaskCard({ task, onToggleDone, onOpen, draggable?, onDragStart?, onDragOver?, onDrop? })` — used by Task 6 (TaskListColumn).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/tasks/task-card.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { TaskCard } from './task-card';
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

describe('TaskCard', () => {
  test('renders the task text', () => {
    render(<TaskCard task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('strikes through and dims the text when done', () => {
    render(<TaskCard task={makeTask({ done: true })} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('Buy milk')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('renders a priority flag only when a priority is set', () => {
    const { rerender } = render(<TaskCard task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<TaskCard task={makeTask({ priority: 'RED' })} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Priority: red' })).toBeInTheDocument();
  });

  test('clicking the card calls onOpen with the task', async () => {
    const onOpen = vi.fn();
    const task = makeTask();
    render(<TaskCard task={task} onToggleDone={vi.fn()} onOpen={onOpen} />);
    await userEvent.click(screen.getByText('Buy milk'));
    expect(onOpen).toHaveBeenCalledWith(task);
  });

  test('toggling the checkbox calls onToggleDone but not onOpen', async () => {
    const onToggleDone = vi.fn();
    const onOpen = vi.fn();
    render(<TaskCard task={makeTask()} onToggleDone={onToggleDone} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggleDone).toHaveBeenCalledWith('t1');
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('renders a due date label when due is set', () => {
    render(<TaskCard task={makeTask({ due: '2026-03-01' })} onToggleDone={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('03-01')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(app\)/tasks/task-card.test.tsx`
Expected: FAIL — `Cannot find module './task-card'`.

- [ ] **Step 3: Write the implementation**

Create `app/(app)/tasks/task-card.tsx`:
```tsx
'use client';

import type { DragEvent } from 'react';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { PriorityFlag, PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import type { TaskDTO } from './queries';

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

export interface TaskCardProps {
  task: TaskDTO;
  onToggleDone: (taskId: string) => void;
  onOpen: (task: TaskDTO) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
}

export function TaskCard({ task, onToggleDone, onOpen, draggable, onDragStart, onDragOver, onDrop }: TaskCardProps) {
  const dueLabel = formatDueLabel(task.due, task.dueTime);
  const accentColor = task.priority ? PRIORITY_COLORS[task.priority] : 'transparent';

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onOpen(task)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 10,
        borderRadius: 'var(--radius-md)',
        background: task.priority
          ? `color-mix(in srgb, ${PRIORITY_COLORS[task.priority]} 8%, var(--surface))`
          : 'var(--surface-2)',
        borderLeft: `3px solid ${accentColor}`,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} />
        <span
          style={{
            fontSize: 'var(--text-sm)',
            flex: 1,
            textDecoration: task.done ? 'line-through' : 'none',
            color: task.done ? 'var(--text-faint)' : 'var(--text-primary)',
          }}
        >
          {task.text}
        </span>
        {task.priority && <PriorityFlag priority={task.priority} />}
      </div>
      {dueLabel && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
          {dueLabel}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/\(app\)/tasks/task-card.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/task-card.tsx" "app/(app)/tasks/task-card.test.tsx"
git commit -m "feat: add TaskCard component"
```

---

## Task 5: TaskDialog component

**Files:**
- Create: `app/(app)/tasks/task-dialog.tsx`
- Test: `app/(app)/tasks/task-dialog.test.tsx`

**Interfaces:**
- Consumes: `TaskListDTO` (type) from `./queries` (Task 1); `Dialog` from `@/app/components/ui/dialog`; `Input` from `@/app/components/ui/input`; `Select` from `@/app/components/ui/select`; `Button` from `@/app/components/ui/button`; `PRIORITY_COLORS`, `PriorityKey` from `@/app/components/ui/priority-flag`.
- Produces: `TaskDialogValues { text: string; listId: string; priority: PriorityKey | null; due: string; dueTime: string }` (a form-friendly shape — `due`/`dueTime` are the literal strings from `<input type="date">`/`<input type="time">`, not parsed yet) and `TaskDialog({ open, mode, lists, initialValues, onClose, onSave, onDelete? })` — used by Task 8 (TasksBoard).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/tasks/task-dialog.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { TaskDialog, type TaskDialogValues } from './task-dialog';
import type { TaskListDTO } from './queries';

const lists: TaskListDTO[] = [
  { id: 'list1', name: 'Work', order: 0, tasks: [] },
  { id: 'list2', name: 'Home', order: 1, tasks: [] },
];

function emptyValues(): TaskDialogValues {
  return { text: '', listId: 'list1', priority: null, due: '', dueTime: '' };
}

describe('TaskDialog', () => {
  test('shows "New task" title in create mode and "Edit task" in edit mode', () => {
    const { rerender } = render(
      <TaskDialog open mode="create" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.getByRole('dialog', { name: 'New task' })).toBeInTheDocument();
    rerender(
      <TaskDialog open mode="edit" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
  });

  test('lists every list as a select option', () => {
    render(
      <TaskDialog open mode="create" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Home' })).toBeInTheDocument();
  });

  test('submitting the form calls onSave with the edited values', async () => {
    const onSave = vi.fn();
    render(
      <TaskDialog open mode="create" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={onSave} />
    );
    await userEvent.type(screen.getByLabelText('Task'), 'Buy milk');
    await userEvent.click(screen.getByRole('button', { name: 'Urgent & important' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ text: 'Buy milk', listId: 'list1', priority: 'RED', due: '', dueTime: '' });
  });

  test('the delete button only appears in edit mode when onDelete is provided, and calls it when clicked', async () => {
    const onDelete = vi.fn();
    const { rerender } = render(
      <TaskDialog open mode="create" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    rerender(
      <TaskDialog
        open
        mode="edit"
        lists={lists}
        initialValues={emptyValues()}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDelete}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(app\)/tasks/task-dialog.test.tsx`
Expected: FAIL — `Cannot find module './task-dialog'`.

- [ ] **Step 3: Write the implementation**

Create `app/(app)/tasks/task-dialog.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { PRIORITY_COLORS, type PriorityKey } from '@/app/components/ui/priority-flag';
import type { TaskListDTO } from './queries';

export interface TaskDialogValues {
  text: string;
  listId: string;
  priority: PriorityKey | null;
  due: string;
  dueTime: string;
}

export interface TaskDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  lists: TaskListDTO[];
  initialValues: TaskDialogValues;
  onClose: () => void;
  onSave: (values: TaskDialogValues) => void;
  onDelete?: () => void;
}

const PRIORITY_OPTIONS: { key: PriorityKey | null; label: string }[] = [
  { key: null, label: 'None' },
  { key: 'RED', label: 'Urgent & important' },
  { key: 'AMBER', label: 'Not urgent but important' },
  { key: 'BLUE', label: 'Urgent but unimportant' },
  { key: 'GREEN', label: 'Not urgent & unimportant' },
];

export function TaskDialog({ open, mode, lists, initialValues, onClose, onSave, onDelete }: TaskDialogProps) {
  const [values, setValues] = useState(initialValues);
  // This project's ESLint config flags setState-inside-useEffect
  // (react-hooks/set-state-in-effect). Use React's documented render-time
  // state-adjustment pattern instead: reset `values` whenever the
  // `initialValues` reference changes, without an effect.
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);
  if (initialValues !== prevInitialValues) {
    setPrevInitialValues(initialValues);
    setValues(initialValues);
  }

  return (
    <Dialog open={open} onClose={onClose} title={mode === 'create' ? 'New task' : 'Edit task'}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(values);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <Input
          label="Task"
          placeholder="What needs doing?"
          value={values.text}
          onChange={(event) => setValues((v) => ({ ...v, text: event.target.value }))}
          autoFocus
        />
        <Select
          label="List"
          options={lists.map((list) => ({ value: list.id, label: list.name }))}
          value={values.listId}
          onChange={(event) => setValues((v) => ({ ...v, listId: event.target.value }))}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Priority</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRIORITY_OPTIONS.map((opt) => {
              const active = values.priority === opt.key;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, priority: opt.key }))}
                  aria-pressed={active}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-pill)',
                    border: `1px solid ${opt.key ? PRIORITY_COLORS[opt.key] : 'var(--border-strong)'}`,
                    background: active ? (opt.key ? PRIORITY_COLORS[opt.key] : 'var(--surface-3)') : 'transparent',
                    color: active && opt.key ? 'var(--on-accent)' : 'var(--text-primary)',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="pw-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <Input
            label="Due date"
            type="date"
            value={values.due}
            onChange={(event) => setValues((v) => ({ ...v, due: event.target.value }))}
          />
          <Input
            label="Time"
            type="time"
            value={values.dueTime}
            onChange={(event) => setValues((v) => ({ ...v, dueTime: event.target.value }))}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          {mode === 'edit' && onDelete ? (
            <Button type="button" variant="outline" onClick={onDelete}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/\(app\)/tasks/task-dialog.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/task-dialog.tsx" "app/(app)/tasks/task-dialog.test.tsx"
git commit -m "feat: add TaskDialog component"
```

---

## Task 6: TaskListColumn component

**Files:**
- Create: `app/(app)/tasks/task-list-column.tsx`
- Test: `app/(app)/tasks/task-list-column.test.tsx`

**Interfaces:**
- Consumes: `TaskDTO`, `TaskListDTO` (types) from `./queries` (Task 1); `TaskCard` from `./task-card` (Task 4); `Icon` from `@/app/components/icons`; `IconButton` from `@/app/components/ui/icon-button`; `Input` from `@/app/components/ui/input`.
- Produces: `TaskListColumn({ list, onToggleDone, onOpenTask, onQuickAdd, onDeleteList, onTaskDragStart, onTaskDrop, onColumnDragStart, onColumnDrop })` — used by Task 8 (TasksBoard). `onTaskDrop(targetListId, targetTaskId)` fires when a task is dropped on this column (either on a specific card, `targetTaskId` set, or on empty column space, `targetTaskId` is `null`).

This test covers every non-drag interaction. Drag/drop wiring itself (the `draggable`/`onDragStart`/`onDragOver`/`onDrop` props) is exercised by Task 8's manual verification and by Task 3's pure-function tests — jsdom cannot simulate real `DragEvent`/`DataTransfer`, so don't attempt to simulate a drag gesture here.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/tasks/task-list-column.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { TaskListColumn } from './task-list-column';
import type { TaskListDTO } from './queries';

function makeList(overrides: Partial<TaskListDTO> = {}): TaskListDTO {
  return {
    id: 'list1',
    name: 'Work',
    order: 0,
    tasks: [
      { id: 't1', text: 'Buy milk', listId: 'list1', priority: null, due: null, dueTime: null, duration: 60, done: false, order: 0 },
    ],
    ...overrides,
  };
}

const noop = {
  onToggleDone: vi.fn(),
  onOpenTask: vi.fn(),
  onQuickAdd: vi.fn(),
  onDeleteList: vi.fn(),
  onTaskDragStart: vi.fn(),
  onTaskDrop: vi.fn(),
  onColumnDragStart: vi.fn(),
  onColumnDrop: vi.fn(),
};

describe('TaskListColumn', () => {
  test('renders the list name, task count, and each task', () => {
    render(<TaskListColumn list={makeList()} {...noop} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('shows "No tasks." when the list is empty', () => {
    render(<TaskListColumn list={makeList({ tasks: [] })} {...noop} />);
    expect(screen.getByText('No tasks.')).toBeInTheDocument();
  });

  test('clicking the delete button calls onDeleteList with the list id', async () => {
    const onDeleteList = vi.fn();
    render(<TaskListColumn list={makeList()} {...noop} onDeleteList={onDeleteList} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete list' }));
    expect(onDeleteList).toHaveBeenCalledWith('list1');
  });

  test('clicking add reveals a quick-add input; typing and pressing Enter calls onQuickAdd and hides it again', async () => {
    const onQuickAdd = vi.fn();
    render(<TaskListColumn list={makeList()} {...noop} onQuickAdd={onQuickAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    const input = screen.getByPlaceholderText('Task name, Enter to add…');
    await userEvent.type(input, 'New task{Enter}');
    expect(onQuickAdd).toHaveBeenCalledWith('list1', 'New task');
    expect(screen.queryByPlaceholderText('Task name, Enter to add…')).not.toBeInTheDocument();
  });

  test('blurring the quick-add input while empty cancels without calling onQuickAdd', async () => {
    const onQuickAdd = vi.fn();
    render(
      <div>
        <TaskListColumn list={makeList()} {...noop} onQuickAdd={onQuickAdd} />
        <button>elsewhere</button>
      </div>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(onQuickAdd).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Task name, Enter to add…')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(app\)/tasks/task-list-column.test.tsx`
Expected: FAIL — `Cannot find module './task-list-column'`.

- [ ] **Step 3: Write the implementation**

Create `app/(app)/tasks/task-list-column.tsx`:
```tsx
'use client';

import { useState, type DragEvent } from 'react';
import { Icon } from '@/app/components/icons';
import { IconButton } from '@/app/components/ui/icon-button';
import { Input } from '@/app/components/ui/input';
import { TaskCard } from './task-card';
import type { TaskDTO, TaskListDTO } from './queries';

export interface TaskListColumnProps {
  list: TaskListDTO;
  onToggleDone: (taskId: string) => void;
  onOpenTask: (task: TaskDTO) => void;
  onQuickAdd: (listId: string, text: string) => void;
  onDeleteList: (listId: string) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onTaskDrop: (targetListId: string, targetTaskId: string | null) => void;
  onColumnDragStart: () => void;
  onColumnDrop: () => void;
}

export function TaskListColumn({
  list,
  onToggleDone,
  onOpenTask,
  onQuickAdd,
  onDeleteList,
  onTaskDragStart,
  onTaskDrop,
  onColumnDragStart,
  onColumnDrop,
}: TaskListColumnProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function submitDraft() {
    const text = draft.trim();
    if (text) onQuickAdd(list.id, text);
    setDraft('');
    setAdding(false);
  }

  function allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  return (
    <div
      className="pw-list-col"
      onDragOver={allowDrop}
      onDrop={(event) => {
        event.preventDefault();
        onTaskDrop(list.id, null);
      }}
    >
      <div
        draggable
        onDragStart={onColumnDragStart}
        onDragOver={allowDrop}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onColumnDrop();
        }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, cursor: 'grab', padding: '2px 0' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Icon name="grip" size={15} style={{ color: 'var(--text-faint)' }} />
          <h4
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-semibold)',
              fontSize: 'var(--text-sm)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {list.name}{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 'var(--weight-regular)', fontFamily: 'var(--font-mono)' }}>
              {list.tasks.length}
            </span>
          </h4>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconButton label="Add task" variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size={15} />
          </IconButton>
          <IconButton label="Delete list" variant="ghost" size="sm" onClick={() => onDeleteList(list.id)}>
            <Icon name="trash" size={15} />
          </IconButton>
        </div>
      </div>
      <div
        className="pw-tasks-scroll pw-scroll"
        style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 20 }}
      >
        {adding && (
          <Input
            size="sm"
            autoFocus
            placeholder="Task name, Enter to add…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitDraft();
              if (event.key === 'Escape') {
                setDraft('');
                setAdding(false);
              }
            }}
            onBlur={() => {
              if (!draft.trim()) setAdding(false);
              else submitDraft();
            }}
          />
        )}
        {list.tasks.map((task) => (
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
        {list.tasks.length === 0 && !adding && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '6px 4px' }}>No tasks.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/\(app\)/tasks/task-list-column.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/task-list-column.tsx" "app/(app)/tasks/task-list-column.test.tsx"
git commit -m "feat: add TaskListColumn component"
```

---

## Task 7: NewListColumn component

**Files:**
- Create: `app/(app)/tasks/new-list-column.tsx`
- Test: `app/(app)/tasks/new-list-column.test.tsx`

**Interfaces:**
- Consumes: `Input` from `@/app/components/ui/input`; `IconButton` from `@/app/components/ui/icon-button`; `Icon` from `@/app/components/icons`.
- Produces: `NewListColumn({ onCreate })` — the trailing add-list column, used by Task 8 (TasksBoard).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/tasks/new-list-column.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { NewListColumn } from './new-list-column';

describe('NewListColumn', () => {
  test('typing a name and submitting calls onCreate and clears the field', async () => {
    const onCreate = vi.fn();
    render(<NewListColumn onCreate={onCreate} />);
    const input = screen.getByPlaceholderText('New list…');
    await userEvent.type(input, 'Groceries{Enter}');
    expect(onCreate).toHaveBeenCalledWith('Groceries');
    expect(input).toHaveValue('');
  });

  test('submitting an empty name does not call onCreate', async () => {
    const onCreate = vi.fn();
    render(<NewListColumn onCreate={onCreate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add list' }));
    expect(onCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(app\)/tasks/new-list-column.test.tsx`
Expected: FAIL — `Cannot find module './new-list-column'`.

- [ ] **Step 3: Write the implementation**

Create `app/(app)/tasks/new-list-column.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Input } from '@/app/components/ui/input';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';

export interface NewListColumnProps {
  onCreate: (name: string) => void;
}

export function NewListColumn({ onCreate }: NewListColumnProps) {
  const [name, setName] = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
  }

  return (
    <div className="pw-list-col" style={{ paddingTop: 2 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        style={{ display: 'flex', gap: 6 }}
      >
        <Input size="sm" placeholder="New list…" value={name} onChange={(event) => setName(event.target.value)} />
        <IconButton type="submit" label="Add list" variant="secondary" size="sm">
          <Icon name="plus" size={15} />
        </IconButton>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/\(app\)/tasks/new-list-column.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/new-list-column.tsx" "app/(app)/tasks/new-list-column.test.tsx"
git commit -m "feat: add NewListColumn component"
```

---

## Task 8: TasksBoard orchestrator

**Files:**
- Create: `app/(app)/tasks/tasks-board.tsx`
- Test: `app/(app)/tasks/tasks-board.test.tsx`

**Interfaces:**
- Consumes: `TaskDTO`, `TaskListDTO` (types) from `./queries` (Task 1); all 8 functions from `./actions` (Task 2) — imported directly (not passed as props) and mocked wholesale in the test via `vi.mock('./actions', ...)`, since threading 8 callbacks through props would be more awkward than mocking the module, and the module boundary is exactly what needs mocking to keep this a DB-free unit test; `moveTaskInLists`, `taskIdsForList`, `moveListInLists` from `./task-reorder` (Task 3); `TaskListColumn` from `./task-list-column` (Task 6); `NewListColumn` from `./new-list-column` (Task 7); `TaskDialog`, `TaskDialogValues` from `./task-dialog` (Task 5).
- Produces: `TasksBoard({ initialLists })` — the full client-side board, used by Task 9 (`page.tsx`).

This test covers every interaction reachable without a real drag gesture (quick-add, toggle-done, open/save/delete via dialog, create list) since jsdom cannot simulate real `DragEvent`/`DataTransfer`. The drag paths themselves are covered by Task 3's pure-function tests (the math) and Task 9's manual walkthrough (the actual gesture, verified as thoroughly as the sandbox allows). One drag-related behavior *is* tested here directly, since it only needs simple event dispatch, not full `DataTransfer` simulation: Task 6's review found that dropping a dragged column on another column's header calls both `onColumnDrop` and (via event bubbling) `onTaskDrop`, which is harmless only because `dragTaskId` happens to be `null` at that point — but a drag *abandoned* outside any valid drop target (released over the browser chrome, say) never reaches an `onDrop` handler at all, so `dragTaskId`/`dragListId` would otherwise stay stale until the next drag and could cause a later, unrelated drop to incorrectly move a task. `TasksBoard` listens for the native `dragend` event on `window` (which always fires when a drag concludes, successful or not) to clear both, and the last test below verifies exactly that.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/tasks/tasks-board.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { TasksBoard } from './tasks-board';
import type { TaskListDTO } from './queries';

vi.mock('./actions', () => ({
  createList: vi.fn(async (name: string) => ({ id: 'newlist', name, order: 1 })),
  deleteList: vi.fn(async () => {}),
  reorderLists: vi.fn(async () => {}),
  createTask: vi.fn(async (input: { text: string; listId: string }) => ({
    id: 'newtask',
    text: input.text,
    listId: input.listId,
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 1,
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
    text: 'Buy milk',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: true,
    order: 0,
  })),
  reorderTasks: vi.fn(async () => {}),
}));

import * as actions from './actions';

function makeLists(): TaskListDTO[] {
  return [
    {
      id: 'list1',
      name: 'Work',
      order: 0,
      tasks: [
        { id: 't1', text: 'Buy milk', listId: 'list1', priority: null, due: null, dueTime: null, duration: 60, done: false, order: 0 },
      ],
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TasksBoard', () => {
  test('renders each list and its tasks', () => {
    render(<TasksBoard initialLists={makeLists()} />);
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('quick-adding a task in a column calls createTask and shows the new task', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    await userEvent.type(screen.getByPlaceholderText('Task name, Enter to add…'), 'New task{Enter}');
    expect(actions.createTask).toHaveBeenCalledWith({ text: 'New task', listId: 'list1' });
    expect(await screen.findByText('New task')).toBeInTheDocument();
  });

  test('toggling a task calls toggleTaskDone optimistically', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(actions.toggleTaskDone).toHaveBeenCalledWith('t1');
    expect(screen.getByText('Buy milk')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('clicking a card opens the edit dialog; saving calls updateTask', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByText('Buy milk'));
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    const input = screen.getByLabelText('Task');
    await userEvent.clear(input);
    await userEvent.type(input, 'Buy oat milk');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(actions.updateTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', text: 'Buy oat milk', listId: 'list1' })
    );
  });

  test('deleting from the dialog calls deleteTask and closes the dialog', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.click(screen.getByText('Buy milk'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(actions.deleteTask).toHaveBeenCalledWith('t1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('creating a new list calls createList and shows the new column', async () => {
    render(<TasksBoard initialLists={makeLists()} />);
    await userEvent.type(screen.getByPlaceholderText('New list…'), 'Home{Enter}');
    expect(actions.createList).toHaveBeenCalledWith('Home');
    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  test('an abandoned drag (dragend fired without a drop) clears drag state, so a later drop is a no-op', () => {
    render(<TasksBoard initialLists={makeLists()} />);
    const card = screen.getByText('Buy milk').closest('div')!;
    fireEvent.dragStart(card);
    window.dispatchEvent(new Event('dragend'));
    const column = screen.getByText('Work').closest('.pw-list-col') as HTMLElement;
    fireEvent.drop(column);
    expect(actions.reorderTasks).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/\(app\)/tasks/tasks-board.test.tsx`
Expected: FAIL — `Cannot find module './tasks-board'`.

- [ ] **Step 3: Write the implementation**

Create `app/(app)/tasks/tasks-board.tsx`:
```tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { TaskListColumn } from './task-list-column';
import { NewListColumn } from './new-list-column';
import { TaskDialog, type TaskDialogValues } from './task-dialog';
import { moveTaskInLists, taskIdsForList, moveListInLists } from './task-reorder';
import type { TaskDTO, TaskListDTO } from './queries';
import {
  createList,
  deleteList,
  reorderLists,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskDone,
  reorderTasks,
} from './actions';

export interface TasksBoardProps {
  initialLists: TaskListDTO[];
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

export function TasksBoard({ initialLists }: TasksBoardProps) {
  const [lists, setLists] = useState(initialLists);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragListId, setDragListId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ task: TaskDTO; values: TaskDialogValues } | null>(null);
  const [, startTransition] = useTransition();

  // A drag abandoned outside any valid drop target (e.g. released over the
  // browser chrome) never reaches an onDrop handler, so dragTaskId/dragListId
  // would otherwise stay stale until the next drag. The native `dragend`
  // event always fires on the drag source when a drag operation concludes,
  // successful or not, and bubbles to window - listen there to always clear
  // both. This subscribes to an external system's events and calls setState
  // from the event callback, not synchronously in the effect body, so it
  // does not trip this project's react-hooks/set-state-in-effect rule.
  useEffect(() => {
    function clearDragState() {
      setDragTaskId(null);
      setDragListId(null);
    }
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, []);

  function handleToggleDone(taskId: string) {
    setLists((prev) =>
      prev.map((list) => ({ ...list, tasks: list.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }))
    );
    startTransition(() => {
      toggleTaskDone(taskId);
    });
  }

  function handleOpenTask(task: TaskDTO) {
    setDialog({ task, values: taskToDialogValues(task) });
  }

  function handleQuickAdd(listId: string, text: string) {
    startTransition(async () => {
      const task = await createTask({ text, listId });
      setLists((prev) => prev.map((list) => (list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list)));
    });
  }

  function handleDeleteList(listId: string) {
    if (!confirm('Delete this list and all its tasks?')) return;
    setLists((prev) => prev.filter((l) => l.id !== listId));
    startTransition(() => {
      deleteList(listId);
    });
  }

  function handleCreateList(name: string) {
    startTransition(async () => {
      const list = await createList(name);
      setLists((prev) => [...prev, { ...list, tasks: [] }]);
    });
  }

  function handleSaveDialog(values: TaskDialogValues) {
    if (!dialog) return;
    const taskId = dialog.task.id;
    const dueTime = parseDueTime(values.dueTime);
    startTransition(async () => {
      const updated = await updateTask({
        id: taskId,
        text: values.text,
        listId: values.listId,
        priority: values.priority,
        due: values.due || null,
        dueTime,
      });
      setLists((prev) =>
        prev.map((list) => ({
          ...list,
          tasks:
            list.id === updated.listId
              ? [...list.tasks.filter((t) => t.id !== taskId), updated]
              : list.tasks.filter((t) => t.id !== taskId),
        }))
      );
    });
    setDialog(null);
  }

  function handleDeleteFromDialog() {
    if (!dialog?.task) return;
    const taskId = dialog.task.id;
    setLists((prev) => prev.map((list) => ({ ...list, tasks: list.tasks.filter((t) => t.id !== taskId) })));
    startTransition(() => {
      deleteTask(taskId);
    });
    setDialog(null);
  }

  function handleTaskDrop(targetListId: string, targetTaskId: string | null) {
    if (!dragTaskId) return;
    const sourceList = lists.find((l) => l.tasks.some((t) => t.id === dragTaskId));
    if (!sourceList) return;
    const sourceListId = sourceList.id;

    const next = moveTaskInLists(lists, dragTaskId, targetListId, targetTaskId);
    setLists(next);

    startTransition(() => {
      if (sourceListId !== targetListId) {
        reorderTasks({ listId: sourceListId, orderedTaskIds: taskIdsForList(next, sourceListId) });
      }
      reorderTasks({ listId: targetListId, orderedTaskIds: taskIdsForList(next, targetListId) });
    });
    setDragTaskId(null);
  }

  function handleColumnDrop(targetListId: string) {
    if (!dragListId) return;
    const next = moveListInLists(lists, dragListId, targetListId);
    setLists(next);
    startTransition(() => {
      reorderLists(next.map((l) => l.id));
    });
    setDragListId(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--pw-vh)' }}>
      <div className="pw-board pw-scroll" style={{ flex: 1, minHeight: 0, paddingTop: 4 }}>
        {lists.map((list) => (
          <TaskListColumn
            key={list.id}
            list={list}
            onToggleDone={handleToggleDone}
            onOpenTask={handleOpenTask}
            onQuickAdd={handleQuickAdd}
            onDeleteList={handleDeleteList}
            onTaskDragStart={(task) => setDragTaskId(task.id)}
            onTaskDrop={handleTaskDrop}
            onColumnDragStart={() => setDragListId(list.id)}
            onColumnDrop={() => handleColumnDrop(list.id)}
          />
        ))}
        <NewListColumn onCreate={handleCreateList} />
      </div>
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

Note: `emptyDialogValues` is defined for future use (e.g. a later phase's dashboard "quick add" wiring straight into this dialog) but not yet called anywhere in this task — this is a false positive for unused-export lint rules, not for `unused-var` rules, since it's exported... actually it is **not** exported above. Remove it if your linter flags it as unused; it is not required by any test in this task. If you hit an unused-variable lint/type error on `emptyDialogValues`, delete the function — nothing in this task's tests calls it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/\(app\)/tasks/tasks-board.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/tasks/tasks-board.tsx" "app/(app)/tasks/tasks-board.test.tsx"
git commit -m "feat: add TasksBoard orchestrator"
```

---

## Task 9: Wire into the Tasks page and manual walkthrough

**Files:**
- Modify: `app/(app)/tasks/page.tsx` (replaces the `StubPage` placeholder from the foundation phase)

**Interfaces:**
- Consumes: `getTaskLists` from `./queries` (Task 1); `TasksBoard` from `./tasks-board` (Task 8).
- Produces: the real `/tasks` route.

- [ ] **Step 1: Replace the stub page**

Read the current file first — it's the foundation phase's stub:
```tsx
import { StubPage } from '@/app/components/shell/stub-page';

export default function TasksPage() {
  return <StubPage title="Tasks" />;
}
```

Replace `app/(app)/tasks/page.tsx` with:
```tsx
import { getTaskLists } from './queries';
import { TasksBoard } from './tasks-board';

export default async function TasksPage() {
  const lists = await getTaskLists();
  return <TasksBoard initialLists={lists} />;
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including every test from Tasks 1–8 in this plan plus everything from the foundation phase (should be 80 + this phase's new test count).

- [ ] **Step 3: Run the integration test suite**

Run: `npm run test:integration`
Expected: all integration tests pass (foundation's Prisma test plus this phase's `queries.integration.test.ts` and `actions.integration.test.ts`), against a reachable Postgres.

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: `Compiled successfully`, TypeScript check passes, `/tasks` appears in the route table.

- [ ] **Step 5: Manual walkthrough**

Before starting: run `ps aux | grep -i node` (or the Windows equivalent) and kill any stray node processes first. Start `npm run dev` with `run_in_background: true`.

1. Log in, navigate to `/tasks`. With no lists yet, you should see only the "New list…" trailing column.
2. Type a name into "New list…" and press Enter — a new column appears with "0" tasks.
3. Click the "+" (add task) button in the column header — an inline input appears, focused. Type a task name and press Enter — the task card appears in the column, input closes.
4. Click the task's checkbox — it fills in with a checkmark; the task text gets a strikethrough. Click again to un-check.
5. Click the task card itself (not the checkbox) — the edit dialog opens with the task's current values. Change the priority to one of the four colors, set a due date, click Save — the dialog closes and the card now shows a colored left border/background tint and a due-date label.
6. Open the dialog again and click Delete — the card disappears.
7. Create a second list. Add a task to it. **Drag a task card from one column and drop it onto a card in the other column** — confirm it visually moves to the new column, in the position you dropped it. Reload the page (`F5`) — confirm the move persisted (this proves the `reorderTasks` server action + revalidation round-tripped through Postgres, not just local state).
8. **Drag a list's header (the grip icon area) and drop it onto another list's header** — confirm the columns swap order. Reload — confirm the new order persisted.
9. Click the trash icon on a list with tasks in it — confirm the browser's native confirm dialog appears; confirming deletes the list and all its tasks. Reload — confirm they're gone (proves cascade delete).
10. Resize the browser below 860px (or use devtools device toolbar) — confirm columns become full-width with horizontal swipe/scroll-snap (the `.pw-list-col`/`.pw-board` CSS from the foundation phase's Task 10).

If no browser is available in your environment (as has been the case throughout this project's sandbox), do as much of steps 1–6 and 9 as possible via `curl` against the running dev server (fetch `/tasks` for the Server Action hidden `$ACTION_*` fields, same technique used throughout the foundation phase's login testing) to prove the create/toggle/update/delete round-trip through real Postgres. Steps 7–8 (drag-and-drop) and step 10 (responsive layout) cannot be meaningfully verified via curl — rely on Task 3's pure-function tests for the reorder math and a careful reading of Tasks 6/8's drag-event wiring for those; say so explicitly in your report rather than claiming a live verification you couldn't do.

When done, stop the dev server (`Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force` on Windows), confirm no node processes remain, then `rm -rf .next`.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/tasks/page.tsx"
git commit -m "feat: wire the Tasks kanban board into /tasks"
```

---

## Self-review notes

- **Spec coverage:** design spec §4.2 — horizontally-scrollable columns (Task 8, reusing foundation `.pw-board`/`.pw-list-col`), drag handle + name + count + add + delete per column header (Task 6), cascading list delete via native `confirm()` (Task 2 DB cascade + Task 8's `confirm()` call), cards with checkbox/strikethrough/priority flag/due label/priority tint (Task 4), drag-and-drop within/across columns updating `listId`/`order` (Tasks 2, 3, 8), click card → edit dialog (Tasks 5, 8), empty column state (Task 6). All covered.
- **Deliberate scope decisions, stated up front in Global Constraints:** no mobile touch drag-and-drop this phase (matches the design spec's own precedent of deferring touch DnD as a separable feature); no click-to-pan horizontal scroll (native scroll methods already satisfy the functional requirement).
- **Type consistency check:** `TaskDTO`/`TaskListDTO` (Task 1) are the single types used by every later task — Task 2's actions, Task 3's pure functions, and every component all import them from `./queries`, never redefine them. `TaskDialogValues` (Task 5) is used identically by Task 8. The `reorderTasks({ listId, orderedTaskIds })` shape (Task 2) matches exactly what `taskIdsForList` (Task 3) produces and what Task 8 passes.
- **Known testability gap, addressed rather than ignored (later found to be over-cautious — see the whole-branch review note below):** jsdom cannot simulate real HTML5 `DragEvent`/`DataTransfer`, so no task in this plan attempts to unit-test a drag gesture. Instead, Task 3 unit-tests the reorder *math* directly (the part that actually has logic worth verifying), and Task 9's manual walkthrough is the only place the actual gesture gets exercised — explicitly calling out that this may not be fully verifiable in a browser-less sandbox, consistent with how the foundation phase handled the same constraint for its own manual checks. **Correction:** this implementation never actually touches `dataTransfer` — drag identity lives entirely in React state (`dragTaskId`/`dragListId`), so plain `fireEvent.dragStart`/`fireEvent.drop` fully exercises the drop-handling glue. The whole-branch review caught that this blind spot let a real bug ship untested (see below) and added the missing tests. **For future phases with their own DnD (Matrix):** don't inherit this plan's blanket claim — check whether the implementation actually needs `dataTransfer` before assuming it's untestable.
- **Dead-code check (caught during self-review, fixed inline):** an earlier draft of Task 8 gave `TasksBoard`'s dialog state a `mode: 'create' | 'edit'` field and a matching create-vs-update branch in `handleSaveDialog`, copied from `TaskDialog`'s own (correctly) dual-mode design. But `TasksBoard` only ever opens the dialog via `handleOpenTask` (always edit), since this screen creates tasks through inline quick-add, not the dialog — so the "create" branch could never execute. Simplified `dialog` to `{ task, values }` and `handleSaveDialog` to update-only; `TaskDialog` itself still fully supports create mode for later phases (Dashboard/Calendar) that will open it blank.
- **Lint-driven fix (caught during Task 5's implementation, verified real by the controller):** this project's ESLint config enables `react-hooks/set-state-in-effect`, which flags the `useEffect(() => setValues(initialValues), [initialValues])` pattern this plan originally specified for `TaskDialog`. Replaced with React's documented render-time state-adjustment pattern (compare against a `prevInitialValues` snapshot, update both during render, no effect) — same public API, verified behaviorally equivalent (and strictly better: no stale-value flash) by task review.
- **Drag-state cleanup fix (caught during Task 6's review, closed before Task 8 was built):** the column header's `onDrop` was missing `stopPropagation()`, so a drop there would bubble and double-fire `onColumnDrop()` plus the outer column's `onTaskDrop(list.id, null)` — harmless only because `dragTaskId` is normally `null` during a pure column drag. But a task-drag *abandoned* outside any valid drop target never reaches an `onDrop` handler, leaving `dragTaskId` stale — combined with the header bug, a later unrelated column drop could incorrectly move that stale task. Fixed the header's missing `stopPropagation()` directly in the already-shipped Task 6 file, and closed the root cause in Task 8's design with a `window`-level `dragend` listener (fires on every drag's conclusion, successful or not) that clears both `dragTaskId` and `dragListId` — plus a test verifying an abandoned drag doesn't leave state that causes a later drop to act.
- **Whole-branch review (post-Task-9, on Opus): 6 Important findings, all fixed before merge.** Per-task reviews are scoped gates and don't catch cross-task or systemic issues — this is exactly what the final broad review is for.
  1. `getTaskLists()` (Task 1) had no `verifySession()` call — the plan's Global Constraints said "every Server Action must call `verifySession()`" but `queries.ts` is a plain read, not an action, so it fell through a gap in how the constraint was worded. Fixed: added `import 'server-only'` + `await verifySession()`, matching every other data-access path in the app. **Plan-authoring lesson:** state the auth constraint as "every server-side data access," not "every Server Action," so future phases' query modules aren't exempted by the same wording gap.
  2. `moveTaskInLists` (Task 3) had no self-drop guard — `moveListInLists` (same file) had one, `moveTaskInLists` didn't, so dropping a card back onto itself silently moved it to the end of its column. Fixed with the same one-line guard pattern; added the matching unit test `moveListInLists`'s own self-drop test already had.
  3. `handleSaveDialog` (Task 8) always appended the edited task to the end of its list's array on save, even when the task never moved — visually correct only until the next reload (since `updateTask` never touches `order`). Fixed to replace-in-place for same-list edits, append only when the dialog's list picker actually moved the task to a different list.
  4. `createList`/`createTask` (Task 2) derived the new item's `order` from `prisma.*.count()`, which collides after any earlier delete leaves a gap (count under-reports the next slot). Fixed both to derive from `aggregate({ _max: { order: true } })` instead — this is a correctness bug in the plan's own originally-specified code, not an implementer deviation. **Plan-authoring lesson:** `count()`-derived ordering is unsafe wherever rows can be deleted; the design spec's other list-like models (Habit, JournalEntry if ever ordered) should use max-based ordering from the start.
  5. `tasks-board.tsx` (Task 8) had no error handling anywhere — every Server Action call fired inside `startTransition` with no `try/catch`, so a failed mutation left the UI silently diverged from the DB forever with no user-visible signal. The plan never asked for this (a genuine plan gap, not a task-level miss). Fixed with a minimal safety net: revert the optimistic `lists` state to its pre-mutation snapshot on failure, surface the failure via `window.alert(...)` (consistent with the existing `confirm()` already used for list deletion — no new UI pattern introduced). **Deferred for a phase-level decision, not fixed here:** whether Matrix/Calendar/Habits/Journal should share a proper toast/notification system and a `useOptimistic`-based pattern instead of ad hoc `alert()` + manual snapshots, once more than one screen needs this.
  6. No DnD interaction was under any test (see the corrected self-review note above) — this is exactly how bug #2 shipped unnoticed through 9 task-level reviews. Fixed by adding a happy-path reorder test and a self-drop regression test to `tasks-board.test.tsx`, both using plain `fireEvent.dragStart`/`fireEvent.drop` (no `dataTransfer` needed, since drag identity is pure React state).
  - **Minor findings deferred to future phases, not fixed now (documented so they aren't silently lost):** a dead `.pw-tasks-scroll` CSS class reference in `task-list-column.tsx` with no matching rule; `.pw-board`'s inherited `cursor: grab` advertises the deliberately-deferred click-to-pan affordance; `toggleTaskDone` is a non-atomic read-then-invert (a double-click race could invert twice and end up wrong) — pass the desired boolean from the client instead of re-deriving server-side; `TasksBoard` holds `useState(initialLists)` and never reconciles with the server-refreshed data `revalidatePath` produces, so client and server state can only fully resync on a hard reload; "Today"/"Tomorrow" due-date labels in `task-card.tsx` are computed in UTC (`toISOString().slice(0,10)`), which is off-by-one near midnight for non-UTC users — extract a shared local-date-key helper before the Calendar phase, which will want the same thing; `TaskDTO.priority: Priority` (Prisma-derived) and `TaskDialogValues.priority: PriorityKey` (UI-derived) are two names for the same union — worth unifying; task cards are click-only `<div>`s with no `role`/keyboard support, out of step with how carefully the foundation's primitives handle accessibility; dropping a task on the "wrong" kind of target (e.g. a task onto another column's header) is a silent no-op rather than being redirected to the right handler; adjacent-downward same-list drags are a visual no-op due to insert-before semantics (dragging a card onto the one directly below it doesn't move it).
