# Tasks & Matrix polish — design

Date: 2026-09-27
Status: approved (Project A of two; Project B = reminders & push notifications, separate spec)

## Goals

1. Completed tasks move into a collapsible "Completed" dropdown under their list, and are deleted automatically 3 days (72 hours) after completion.
2. Priority colors become red, yellow, blue, green.
3. Matrix quadrants get a solid colored header band.

## 1. Completed dropdown + auto-delete

### Schema

- Add `completedAt DateTime?` to `Task`.
- Migration backfills `completedAt = now()` for rows where `done = true`, so existing completed tasks are deleted 3 days after the deploy rather than immediately.

### Actions

- `toggleTaskDone` sets `completedAt = new Date()` when a task becomes done and `completedAt = null` when it becomes undone. Re-completing restarts the 3-day clock.
- Any other code path that sets `done` (if one exists) follows the same rule.

### Purge

- New `purgeExpiredTasks()` in the tasks module: `prisma.task.deleteMany({ where: { done: true, completedAt: { lt: now - 72h } } })`.
- Called at the start of the task-reading queries for the Tasks, Matrix, Calendar and Dashboard pages (lazy purge, no scheduler). A task is gone the next time any of those pages loads after its 72 hours are up.
- Can later move to the scheduled job introduced by Project B.

### Tasks page UI

- `TaskListColumn` splits `list.tasks` into open and done.
- Open tasks render as today (drag-reorderable, quick-add above).
- Below them, a toggle button `Completed (n)` with a chevron, collapsed by default and hidden when n = 0. Expanded, it lists the done tasks sorted by `completedAt` descending. Done tasks are not draggable.
- The collapsed/expanded state is per-column, local component state (not persisted).
- Unticking a done task moves it back to the open list (existing optimistic toggle handles it).
- The header count stays "open tasks".
- `TaskDTO` gains `completedAt: string | null`.

### Matrix

- The matrix query excludes `done: true` tasks. Ticking a task in the matrix removes it from view (optimistic).

### Calendar

- Unchanged: done tasks remain visible (struck through) until purged.

## 2. Priority colors

- New tokens in the Still token CSS: `--prio-red`, `--prio-yellow`, `--prio-blue`, `--prio-green`, saturated but not neon, with lighter dark-mode overrides.
- `PRIORITY_COLORS` maps `RED → --prio-red`, `AMBER → --prio-yellow`, `BLUE → --prio-blue`, `GREEN → --prio-green`.
- The `Priority` enum is unchanged (the `AMBER` value is displayed as yellow); no data migration.
- Everything using `PRIORITY_COLORS` (flags, task dialog picker, matrix flag menu, quadrants) picks the new colors up automatically.

## 3. Matrix quadrant header band

- `QuadrantPanel` header becomes a solid band filled with the quadrant color, with rounded top corners matching the panel radius.
- The band holds the title, subtitle and a count pill. Text is white, except on yellow, where it is dark (`--fg-1`-level dark) for contrast. Export a `PRIORITY_ON_COLORS` map alongside `PRIORITY_COLORS` for this.
- The task area uses the neutral `--surface-1` background; the panel border is tinted with the quadrant color.
- The drop-target state keeps a ring in the quadrant color.
- The small square dot in the header is removed (the band carries the color).

## Testing

- Unit: `TaskListColumn` Completed dropdown (hidden when empty, collapsed by default, expands on click, shows done tasks newest first, open count unchanged).
- Unit: `QuadrantPanel` renders the header band with title, subtitle, count.
- Integration: `toggleTaskDone` sets and clears `completedAt`; `purgeExpiredTasks` deletes a task completed 73h ago and keeps one completed 71h ago and all undone tasks; the matrix query excludes done tasks.
- Existing tests updated where DTO shape or colors are asserted.

## Out of scope

- Reminders and push notifications (Project B).
- Persisting the dropdown open state.
