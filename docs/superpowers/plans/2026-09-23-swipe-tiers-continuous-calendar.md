# Swipe Tiers, Rolling Week & Continuous Month/Year Calendars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) In the calendar Day/3-Day/Week grids a short swipe moves 1 day and a long swipe moves the view's full step (3 or 7 days), with Week becoming a rolling 7-day window; (2) Month and Year become continuous vertical-scroll calendars with clear per-month / per-year separation, reaching any month/year by scrolling or a jump picker.

**Architecture:** Swipe strength is a small pure function plus a strength argument on the existing `useSwipe` callbacks; the board maps `(view, strength)` to a day count. Month and Year share one `useScrollWindow` hook that works on integer unit indexes (month index = `year*12+month`, or the year itself): it renders a window of units around an anchor, grows it near the scroll edges (compensating `scrollTop` when prepending), scrolls to the anchor when the parent changes it, and reports which unit is at the top. `MonthView`/`YearView` are rewritten on top of it; a `CalendarJumpPicker` popover hangs off the header title.

**Tech Stack:** Next.js 16.3.5 App Router (React 19.2, React Compiler on), plain CSS in `app/styles/layout.css`, Vitest 5 + React Testing Library + jsdom 30.

**Spec:** `docs/superpowers/specs/2026-09-23-swipe-tiers-and-continuous-calendar-design.md`

**Deliberate deviations from the spec** (Task 3 syncs the spec text): near-edge detection uses the scroll position (`scrollTop` vs `clientHeight`/`scrollHeight`) instead of `IntersectionObserver` sentinels (simpler and testable in jsdom); window math uses integer unit indexes inside the hook instead of separate `monthWindow`/`yearWindow` helpers.

## Global Constraints

- Swipe tiers: a committed swipe (existing rule: travel > 25% of grid width, or a fast flick > 40px and > 0.5px/ms) is **long** when travel >= 60% of the grid width (`LONG_SWIPE_RATIO = 0.6`), otherwise **short**. Short = 1 day. Long = the view's full step: `day` 1, `3day` 3, `week` 7.
- Header prev/next arrows are unchanged: they always move the full step (1, 3, 7 days; month +-1; year +-1).
- Week view is a rolling 7-day window starting at the anchor date (`weekDates(calDate)`); title = `shortDateLabel(calDate) – shortDateLabel(calDate + 6 days)` (en dash), e.g. `Sep 23 – Sep 29`. `startOfWeekSunday` stays exported from `app/lib/calendar-dates.ts`.
- Swipe applies to Day / 3-Day / Week only. Month and Year use native vertical scroll (no swipe).
- Month view: one block per month with a heading (`monthYearLabel`), divider and extra spacing; one sticky weekday row (Sun–Sat) at the top of the scroll area; blocks show only their own days (blank placeholder slots, no neighboring-month days); fully-empty week rows are dropped; below 560px cell min-height is 64px (84px otherwise).
- Year view: one block per year with a large sticky year heading and divider; month cards keep the compact grid: 4 columns above 860px, 3 columns at 860px and below.
- Scroll window: Month view renders +-6 months around the anchor initially and adds 6 per extension; Year view +-2 years and adds 2. Extension triggers when the scroll position is within one viewport height (`clientHeight`) of an edge. The window only grows while scrolling; a jump resets it around the target. When prepending, `scrollTop` is compensated by the added height (iOS Safari has no scroll anchoring). Range is clamped to years 1900–2100.
- Jump picker: the header title becomes a button (Month and Year views only) that opens a popover (`role="dialog"`, `aria-label="Jump to date"`) with a year field (1900–2100, clamped) and, in Month view, 12 month buttons; Year view shows a "Go" button. Escape or a backdrop click closes it.
- Header title follows the scroll. When the visible month/year changes and `calDate` is not already inside it, `calDate` becomes the first day of the visible month (Month view) or January 1 of the visible year (Year view); if `calDate` is already inside it, it is left untouched.
- Do not touch `app/(app)/dashboard/`. Do not touch the untracked `Personal productivity webapp/` directory.
- React Compiler is on: no `ref.current` reads/writes during render (only in handlers/effects). Calling a state setter during render for "adjust state when a prop changes" is allowed.
- jsdom facts (verified): it keeps values assigned to `element.scrollTop`, and `PointerEvent` exists. It does no layout, so tests stub `clientHeight` / `scrollHeight` / `getBoundingClientRect` where layout matters.
- Every commit message ends with these two trailer lines, verbatim, separated from the body by a blank line:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
  ```
- Test command pattern: `npx vitest run "<path>"`. Full suite: `npm test`. Also run `npx tsc --noEmit` and `npm run lint` before each commit (lint errors under `Personal productivity webapp/` are pre-existing and are not yours). Never claim a check passed without running it and reading the output.
- Existing tests stay green at every commit; only change existing tests where a task says so.

---

## Task 1: Swipe tiers and rolling Week

**Files:**
- Modify: `app/lib/use-swipe.ts`
- Modify: `app/lib/use-swipe.test.tsx` (extend the import; append a `describe`)
- Modify: `app/(app)/calendar/day-week-grid.tsx` (import line + the two prop types)
- Modify: `app/(app)/calendar/day-week-grid.test.tsx` (add two tests inside `describe('DayWeekGrid swipe and density'`)
- Modify: `app/(app)/calendar/calendar-views.ts` (add `swipeStepDays`)
- Create: `app/(app)/calendar/swipe-step.test.ts`
- Modify: `app/(app)/calendar/calendar-board.tsx`
- Modify: `app/(app)/calendar/calendar-board.test.tsx` (replace the `describe('CalendarBoard swipe navigation'` block)

**Interfaces:**
- Produces (from `@/app/lib/use-swipe`): `type SwipeStrength = 'short' | 'long'`, `LONG_SWIPE_RATIO = 0.6`, `swipeStrength(dx: number, width: number): SwipeStrength`; `UseSwipeOptions.onSwipeLeft/onSwipeRight` become `(strength: SwipeStrength) => void`.
- Produces (from `./calendar-views`): `swipeStepDays(view: CalView, strength: SwipeStrength): number`.
- `DayWeekGridProps.onSwipePrev/onSwipeNext` become `(strength: SwipeStrength) => void`.

- [ ] **Step 1: Write the failing tests**

In `app/lib/use-swipe.test.tsx`, change the import to also pull in `swipeStrength`:

```tsx
import { useSwipe, lockAxis, resolveSwipe, swipeStrength, SLIDE_MS } from '@/app/lib/use-swipe';
```

Append at the end of that file (it reuses the file's top-level `Harness`, `getSurface` and `drag` helpers and the top-level `beforeEach`/`afterEach`):

```tsx
describe('swipeStrength', () => {
  test('is short below 60% of the width and long at or above it', () => {
    expect(swipeStrength(-150, 400)).toBe('short');
    expect(swipeStrength(-239, 400)).toBe('short');
    expect(swipeStrength(-240, 400)).toBe('long');
    expect(swipeStrength(300, 400)).toBe('long');
  });
});

describe('useSwipe strength', () => {
  test('a swipe under 60% of the width reports "short"', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    drag(getSurface(), { dx: -150 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onLeft).toHaveBeenCalledWith('short');
  });

  test('a swipe of 60% or more reports "long" in both directions', () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    render(<Harness onLeft={onLeft} onRight={onRight} />);
    const el = getSurface();
    drag(el, { dx: -260 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onLeft).toHaveBeenCalledWith('long');
    vi.advanceTimersByTime(1000); // let the slide settle so the next swipe is accepted
    drag(el, { dx: 260 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onRight).toHaveBeenCalledWith('long');
  });

  test('a fast flick that travels little is short', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    drag(getSurface(), { dx: -60, ms: 80 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onLeft).toHaveBeenCalledWith('short');
  });
});
```

In `app/(app)/calendar/day-week-grid.test.tsx`, inside `describe('DayWeekGrid swipe and density'`, insert these two tests immediately before `test('without swipe callbacks a swipe does nothing', () => {`:

```tsx
  test('a swipe under 60% of the width passes "short" to the callback', () => {
    const onSwipeNext = vi.fn();
    swipe(renderGrid({ onSwipeNext, onSwipePrev: vi.fn() }), -200);
    expect(onSwipeNext).toHaveBeenCalledWith('short');
  });

  test('a swipe of 60% or more passes "long" to the callback', () => {
    const onSwipePrev = vi.fn();
    swipe(renderGrid({ onSwipeNext: vi.fn(), onSwipePrev }), 300);
    expect(onSwipePrev).toHaveBeenCalledWith('long');
  });
```

Create `app/(app)/calendar/swipe-step.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { swipeStepDays } from './calendar-views';

describe('swipeStepDays', () => {
  test('a short swipe is always 1 day', () => {
    for (const view of ['day', '3day', 'week'] as const) {
      expect(swipeStepDays(view, 'short')).toBe(1);
    }
  });

  test('a long swipe moves the full step of the view', () => {
    expect(swipeStepDays('day', 'long')).toBe(1);
    expect(swipeStepDays('3day', 'long')).toBe(3);
    expect(swipeStepDays('week', 'long')).toBe(7);
  });
});
```

In `app/(app)/calendar/calendar-board.test.tsx`, replace the entire `describe('CalendarBoard swipe navigation', () => { ... });` block (the last block in the file) with:

```tsx
describe('CalendarBoard swipe navigation', () => {
  // The grid is stubbed to 400px wide: 200px is a 50% (short) swipe, 300px a 75% (long) one.
  function swipeGrid(container: HTMLElement, dx: number) {
    const grid = container.querySelector('.pw-calgrid') as HTMLElement;
    Object.defineProperty(grid, 'clientWidth', { value: 400, configurable: true });
    const at = (x: number) => ({ pointerId: 1, pointerType: 'touch', clientX: x, clientY: 300 });
    fireEvent.pointerDown(grid, at(200));
    fireEvent.pointerMove(grid, at(200 + dx / 2));
    fireEvent.pointerMove(grid, at(200 + dx));
    fireEvent.pointerUp(grid, at(200 + dx));
  }

  test('Day: swiping left moves to tomorrow; swiping right moves back', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, -200);
    expect(await screen.findByText('Tomorrow')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400)); // let the slide-in finish
    swipeGrid(container, 200);
    await waitFor(() => expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument());
  }, 10000);

  test('Day: swiping right moves to yesterday', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, 200);
    expect(await screen.findByText('Yesterday')).toBeInTheDocument();
  }, 10000);

  test('Day: a long swipe also moves only 1 day', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, -300);
    expect(await screen.findByText('Tomorrow')).toBeInTheDocument();
  }, 10000);

  test('3-Day: a short swipe advances by 1 day', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: '3-Day' }));
    expect(screen.getByText('Sep 23 – Sep 25')).toBeInTheDocument();
    swipeGrid(container, -200);
    expect(await screen.findByText('Sep 24 – Sep 26')).toBeInTheDocument();
  }, 10000);

  test('3-Day: a long swipe advances by 3 days', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: '3-Day' }));
    swipeGrid(container, -300);
    expect(await screen.findByText('Sep 26 – Sep 28')).toBeInTheDocument();
  }, 10000);

  test('Week: opens as a rolling 7-day window starting at the anchor date', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    expect(screen.getByText('Sep 23 – Sep 29')).toBeInTheDocument();
  }, 10000);

  test('Week: a short swipe advances by 1 day', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    swipeGrid(container, -200);
    expect(await screen.findByText('Sep 24 – Sep 30')).toBeInTheDocument();
  }, 10000);

  test('Week: a long swipe advances by 7 days', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    swipeGrid(container, -300);
    expect(await screen.findByText('Sep 30 – Oct 6')).toBeInTheDocument();
  }, 10000);

  test('a short swipe below the threshold does not change the date', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, -20);
    expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument();
  }, 10000);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "app/lib/use-swipe.test.tsx" "app/(app)/calendar/swipe-step.test.ts" "app/(app)/calendar/day-week-grid.test.tsx" "app/(app)/calendar/calendar-board.test.tsx"`
Expected: FAIL — `swipeStrength` / `swipeStepDays` are not exported; callbacks are called with no arguments; the Week title is still `Sep 20 – Sep 26`.

- [ ] **Step 3: Implement**

`app/lib/use-swipe.ts` — five edits:

1. After the line `export const SLIDE_MS = 150;` add:

```ts
export const LONG_SWIPE_RATIO = 0.6;

export type SwipeStrength = 'short' | 'long';
```

2. Immediately before `function prefersReducedMotion(): boolean {` add:

```ts
export function swipeStrength(dx: number, width: number): SwipeStrength {
  return Math.abs(dx) >= width * LONG_SWIPE_RATIO ? 'long' : 'short';
}

```

3. Replace the options interface:

```ts
export interface UseSwipeOptions {
  onSwipeLeft?: (strength: SwipeStrength) => void;
  onSwipeRight?: (strength: SwipeStrength) => void;
}
```

4. Change the signature and body of `finish`:

```ts
  function finish(direction: 'next' | 'prev', strength: SwipeStrength) {
    const el = ref.current;
    if (!el) return;
    const fire = () => {
      if (direction === 'next') callbacks.current.onSwipeLeft?.(strength);
      else callbacks.current.onSwipeRight?.(strength);
    };
```

(leave the rest of `finish` exactly as it is).

5. In `onPointerUp`, replace the `const result = resolveSwipe({ ... });` statement and the `if (result === ...)` line that follows it with:

```ts
    const dx = event.clientX - g.startX;
    const width = ref.current?.clientWidth || 1;
    const result = resolveSwipe({ dx, dy: event.clientY - g.startY, dt: performance.now() - g.startT, width });
    if (result === 'next' || result === 'prev') finish(result, swipeStrength(dx, width));
    else setOffset(0, true);
```

`app/(app)/calendar/day-week-grid.tsx` — change the import and the two prop types:

```tsx
import { useSwipe, type SwipeStrength } from '@/app/lib/use-swipe';
```

```tsx
  onSwipePrev?: (strength: SwipeStrength) => void;
  onSwipeNext?: (strength: SwipeStrength) => void;
```

`app/(app)/calendar/calendar-views.ts` — add near the top imports and append the function:

```ts
import type { CalView } from './calendar-view-pill';
import type { SwipeStrength } from '@/app/lib/use-swipe';
```

```ts
export function swipeStepDays(view: CalView, strength: SwipeStrength): number {
  if (strength === 'short') return 1;
  return view === '3day' ? 3 : view === 'week' ? 7 : 1;
}
```

`app/(app)/calendar/calendar-board.tsx`:

1. Add `import type { SwipeStrength } from '@/app/lib/use-swipe';` and add `swipeStepDays` to the existing import from `'./calendar-views'`. Remove `startOfWeekSunday` from the `@/app/lib/calendar-dates` import list.
2. After `handleToday`, add:

```tsx
  function handleSwipe(direction: 1 | -1, strength: SwipeStrength) {
    setCalDate((d) => addDays(d, direction * swipeStepDays(calView, strength)));
  }
```

3. Replace the Week branch of `title`:

```tsx
        : calView === 'week'
          ? `${shortDateLabel(calDate)} – ${shortDateLabel(addDays(calDate, 6))}`
```

(it replaces the old `(() => { const start = startOfWeekSunday(calDate); ... })()` expression).
4. In `dateKeysForGrid` replace `weekDates(startOfWeekSunday(calDate))` with `weekDates(calDate)`.
5. On the `<DayWeekGrid` element replace `onSwipePrev={handlePrev}` / `onSwipeNext={handleNext}` with:

```tsx
          onSwipePrev={(strength) => handleSwipe(-1, strength)}
          onSwipeNext={(strength) => handleSwipe(1, strength)}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "app/lib/use-swipe.test.tsx" "app/(app)/calendar"` — Expected: all PASS.
Run: `npm test`, `npx tsc --noEmit`, `npm run lint` — Expected: all clean (no new lint problems in `app/`).

- [ ] **Step 5: Commit**

```bash
git add app/lib/use-swipe.ts app/lib/use-swipe.test.tsx "app/(app)/calendar/day-week-grid.tsx" "app/(app)/calendar/day-week-grid.test.tsx" "app/(app)/calendar/calendar-views.ts" "app/(app)/calendar/swipe-step.test.ts" "app/(app)/calendar/calendar-board.tsx" "app/(app)/calendar/calendar-board.test.tsx"
git commit -m "$(cat <<'EOF'
feat: short swipe moves 1 day, long swipe moves the full step; rolling 7-day week

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

---

## Task 2: Pure helpers for continuous calendars

**Files:**
- Create: `app/lib/calendar-units.ts`
- Create: `app/lib/calendar-units.test.ts`
- Modify: `app/(app)/calendar/calendar-views.ts` (append `indexTasksByDate`, `buildMonthWeeks`)
- Create: `app/(app)/calendar/calendar-month-weeks.test.ts`

**Interfaces:**
- Produces (`@/app/lib/calendar-units`): `MIN_YEAR = 1900`, `MAX_YEAR = 2100`, `MIN_MONTH_INDEX`, `MAX_MONTH_INDEX`, `clampYear(year: number): number`, `yearOfDateKey(dateKey: string): number`, `monthIndexOfDateKey(dateKey: string): number` (`year*12 + month0`), `monthIndexToParts(monthIndex: number): { year: number; month: number }` (month 0–11), `firstOfMonthKey(monthIndex: number): string` (`YYYY-MM-01`), `firstOfYearKey(year: number): string` (`YYYY-01-01`).
- Produces (`./calendar-views`): `indexTasksByDate(tasks: TaskDTO[]): Map<string, TaskDTO[]>`, `buildMonthWeeks(index: Map<string, TaskDTO[]>, year: number, month: number): (MonthCellData | null)[][]` — rows of 7 slots; slots outside the month are `null`; rows with no in-month day are dropped; a cell has up to 3 `chips` plus `moreCount`.
- Consumes: `buildMonthGrid` from `@/app/lib/calendar-dates`, `MonthCellData` (already exported from `calendar-views.ts`).

- [ ] **Step 1: Write the failing tests**

Create `app/lib/calendar-units.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import {
  MIN_YEAR,
  MAX_YEAR,
  MIN_MONTH_INDEX,
  MAX_MONTH_INDEX,
  clampYear,
  yearOfDateKey,
  monthIndexOfDateKey,
  monthIndexToParts,
  firstOfMonthKey,
  firstOfYearKey,
} from '@/app/lib/calendar-units';

describe('clampYear', () => {
  test('clamps to 1900–2100 and truncates fractions', () => {
    expect(clampYear(1800)).toBe(MIN_YEAR);
    expect(clampYear(2500)).toBe(MAX_YEAR);
    expect(clampYear(2026)).toBe(2026);
    expect(clampYear(2026.7)).toBe(2026);
  });
});

describe('month index helpers', () => {
  test('yearOfDateKey reads the year', () => {
    expect(yearOfDateKey('2026-09-23')).toBe(2026);
  });

  test('monthIndexOfDateKey is year*12 + zero-based month', () => {
    expect(monthIndexOfDateKey('2026-09-23')).toBe(2026 * 12 + 8);
    expect(monthIndexOfDateKey('2027-01-01')).toBe(2027 * 12);
  });

  test('monthIndexToParts round-trips', () => {
    expect(monthIndexToParts(2026 * 12 + 8)).toEqual({ year: 2026, month: 8 });
    expect(monthIndexToParts(2027 * 12)).toEqual({ year: 2027, month: 0 });
  });

  test('firstOfMonthKey and firstOfYearKey build zero-padded keys', () => {
    expect(firstOfMonthKey(2026 * 12 + 8)).toBe('2026-09-01');
    expect(firstOfMonthKey(2027 * 12)).toBe('2027-01-01');
    expect(firstOfYearKey(2026)).toBe('2026-01-01');
  });

  test('the bounds are January 1900 and December 2100', () => {
    expect(firstOfMonthKey(MIN_MONTH_INDEX)).toBe('1900-01-01');
    expect(firstOfMonthKey(MAX_MONTH_INDEX)).toBe('2100-12-01');
  });
});
```

Create `app/(app)/calendar/calendar-month-weeks.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { indexTasksByDate, buildMonthWeeks } from './calendar-views';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Task',
    listId: 'list1',
    priority: null,
    due: '2026-09-10',
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

describe('indexTasksByDate', () => {
  test('groups tasks by due date and skips tasks without one', () => {
    const index = indexTasksByDate([
      makeTask({ id: 'a', due: '2026-09-10' }),
      makeTask({ id: 'b', due: '2026-09-10' }),
      makeTask({ id: 'c', due: '2026-09-11' }),
      makeTask({ id: 'd', due: null }),
    ]);
    expect(index.get('2026-09-10')?.map((t) => t.id)).toEqual(['a', 'b']);
    expect(index.get('2026-09-11')?.map((t) => t.id)).toEqual(['c']);
    expect(index.size).toBe(2);
  });
});

describe('buildMonthWeeks', () => {
  test('September 2026 (starts on a Tuesday, 30 days) has 5 rows of 7 slots', () => {
    const weeks = buildMonthWeeks(new Map(), 2026, 8);
    expect(weeks).toHaveLength(5);
    for (const week of weeks) expect(week).toHaveLength(7);
  });

  test('slots outside the month are null and days inside are real cells', () => {
    const weeks = buildMonthWeeks(new Map(), 2026, 8);
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toBeNull();
    expect(weeks[0][2]?.dateKey).toBe('2026-09-01');
    expect(weeks[4][3]?.dateKey).toBe('2026-09-30');
    expect(weeks[4][4]).toBeNull();
    expect(weeks.flat().filter((c) => c !== null)).toHaveLength(30);
  });

  test('February 2026 starts on a Sunday and fits exactly 4 full rows', () => {
    const weeks = buildMonthWeeks(new Map(), 2026, 1);
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((c) => c !== null)).toBe(true);
  });

  test('August 2026 (starts on a Saturday, 31 days) needs 6 rows', () => {
    expect(buildMonthWeeks(new Map(), 2026, 7)).toHaveLength(6);
  });

  test('a cell shows up to 3 chips and counts the rest in moreCount', () => {
    const tasks = Array.from({ length: 5 }, (_, i) => makeTask({ id: `t${i}` }));
    const weeks = buildMonthWeeks(indexTasksByDate(tasks), 2026, 8);
    const cell = weeks.flat().find((c) => c?.dateKey === '2026-09-10');
    expect(cell?.chips).toHaveLength(3);
    expect(cell?.moreCount).toBe(2);
  });

  test('days without tasks have no chips', () => {
    const weeks = buildMonthWeeks(new Map(), 2026, 8);
    const cell = weeks.flat().find((c) => c?.dateKey === '2026-09-12');
    expect(cell?.chips).toEqual([]);
    expect(cell?.moreCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "app/lib/calendar-units.test.ts" "app/(app)/calendar/calendar-month-weeks.test.ts"`
Expected: FAIL — `@/app/lib/calendar-units` does not exist; `indexTasksByDate` / `buildMonthWeeks` are not exported.

- [ ] **Step 3: Implement**

Create `app/lib/calendar-units.ts`:

```ts
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;
export const MIN_MONTH_INDEX = MIN_YEAR * 12;
export const MAX_MONTH_INDEX = MAX_YEAR * 12 + 11;

export function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.trunc(year)));
}

export function yearOfDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}

/** A month as a single integer: year * 12 + zero-based month. */
export function monthIndexOfDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4)) * 12 + (Number(dateKey.slice(5, 7)) - 1);
}

export function monthIndexToParts(monthIndex: number): { year: number; month: number } {
  return { year: Math.floor(monthIndex / 12), month: monthIndex % 12 };
}

export function firstOfMonthKey(monthIndex: number): string {
  const { year, month } = monthIndexToParts(monthIndex);
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`;
}

export function firstOfYearKey(year: number): string {
  return `${String(year).padStart(4, '0')}-01-01`;
}
```

Append to `app/(app)/calendar/calendar-views.ts` (add `buildMonthGrid` to the existing `@/app/lib/calendar-dates` import, which currently imports `addDays` and `type MonthGridCell`):

```ts
export function indexTasksByDate(tasks: TaskDTO[]): Map<string, TaskDTO[]> {
  const index = new Map<string, TaskDTO[]>();
  for (const task of tasks) {
    if (task.due === null) continue;
    const existing = index.get(task.due);
    if (existing) existing.push(task);
    else index.set(task.due, [task]);
  }
  return index;
}

export function buildMonthWeeks(index: Map<string, TaskDTO[]>, year: number, month: number): (MonthCellData | null)[][] {
  const grid = buildMonthGrid(year, month);
  const weeks: (MonthCellData | null)[][] = [];
  for (let start = 0; start < grid.length; start += 7) {
    const row = grid.slice(start, start + 7);
    if (!row.some((cell) => cell.inMonth)) continue;
    weeks.push(
      row.map((cell) => {
        if (!cell.inMonth) return null;
        const dayTasks = index.get(cell.dateKey) ?? [];
        return {
          dateKey: cell.dateKey,
          inMonth: true,
          chips: dayTasks.slice(0, 3),
          moreCount: Math.max(0, dayTasks.length - 3),
        };
      })
    );
  }
  return weeks;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "app/lib/calendar-units.test.ts" "app/(app)/calendar/calendar-month-weeks.test.ts"` — Expected: PASS.
Run: `npm test`, `npx tsc --noEmit`, `npm run lint` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add app/lib/calendar-units.ts app/lib/calendar-units.test.ts "app/(app)/calendar/calendar-views.ts" "app/(app)/calendar/calendar-month-weeks.test.ts"
git commit -m "$(cat <<'EOF'
feat: add month-index helpers and per-month week builder for continuous calendars

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

---

## Task 3: `useScrollWindow` hook (and spec sync)

**Files:**
- Create: `app/lib/use-scroll-window.ts`
- Create: `app/lib/use-scroll-window.test.tsx`
- Modify: `docs/superpowers/specs/2026-09-23-swipe-tiers-and-continuous-calendar-design.md` (two sentences, Step 6)

**Interfaces:**
- Produces: `useScrollWindow(options): { containerRef: RefObject<HTMLDivElement | null>; onScroll: (event: UIEvent<HTMLDivElement>) => void; start: number; end: number }` where `options = { anchor: number; min: number; max: number; span: number; scrollOffset?: number; onVisibleChange?: (index: number) => void }`.
- Contract for consumers: render one element per unit index in `start..end` (inclusive) as a **direct child** of the container, each with a `data-unit={index}` attribute, in ascending order; attach `containerRef` and `onScroll` to the scroll container.
- Behavior: the window is `[max(min, anchor - span), min(max, anchor + span)]`. When the `anchor` prop differs from the hook's last-synced unit (an external change: arrows, picker, Today, tapping a month), the window resets around it if it lies outside the window, and the container scrolls so that unit's top sits `scrollOffset` px from the container top. On scroll: near the top (`scrollTop < clientHeight`) and `start > min` the window grows upward by `span` and `scrollTop` is compensated by the added height; near the bottom (`scrollHeight - scrollTop - clientHeight < clientHeight`) and `end < max` it grows downward by `span`; the first unit whose bottom edge is below `containerTop + 80` is the "visible" unit and, when it differs from the last synced unit, `onVisibleChange(index)` fires once and the unit becomes the synced anchor (so a parent that adopts it does not trigger a re-scroll).

- [ ] **Step 1: Write the failing tests**

Create `app/lib/use-scroll-window.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { useScrollWindow } from '@/app/lib/use-scroll-window';

const UNIT_PX = 100;
const VIEW_PX = 300;

function rect(top: number, height: number): DOMRect {
  return { top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}

// jsdom does no layout: fake a 300px-high viewport whose units are 100px tall.
beforeEach(() => {
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(VIEW_PX);
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
    return this.querySelectorAll('[data-unit]').length * UNIT_PX;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.unit === undefined) return rect(0, VIEW_PX);
    const container = this.parentElement as HTMLElement;
    const first = Number((container.querySelector('[data-unit]') as HTMLElement).dataset.unit);
    return rect((Number(this.dataset.unit) - first) * UNIT_PX - container.scrollTop, UNIT_PX);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Harness({
  anchor,
  min = 0,
  max = 100,
  span = 3,
  scrollOffset,
  onVisible,
}: {
  anchor: number;
  min?: number;
  max?: number;
  span?: number;
  scrollOffset?: number;
  onVisible?: (index: number) => void;
}) {
  const { containerRef, onScroll, start, end } = useScrollWindow({ anchor, min, max, span, scrollOffset, onVisibleChange: onVisible });
  const units = [];
  for (let i = start; i <= end; i++) units.push(<div key={i} data-unit={i}>unit {i}</div>);
  return (
    <div ref={containerRef} onScroll={onScroll} data-testid="c">
      {units}
    </div>
  );
}

// Behaves like a real parent: it adopts the unit the hook reports as its new anchor.
function AdoptingHarness({ initial, onVisible }: { initial: number; onVisible: (index: number) => void }) {
  const [anchor, setAnchor] = useState(initial);
  return (
    <Harness
      anchor={anchor}
      onVisible={(index) => {
        setAnchor(index);
        onVisible(index);
      }}
    />
  );
}

const container = () => screen.getByTestId('c');
const hasUnit = (index: number) => container().querySelector(`[data-unit="${index}"]`) !== null;

describe('useScrollWindow', () => {
  test('renders the anchor plus/minus span, clamped to the bounds', () => {
    render(<Harness anchor={10} />);
    expect(hasUnit(7)).toBe(true);
    expect(hasUnit(13)).toBe(true);
    expect(hasUnit(6)).toBe(false);
    expect(hasUnit(14)).toBe(false);
  });

  test('clamps the window at the minimum', () => {
    render(<Harness anchor={1} min={0} />);
    expect(hasUnit(0)).toBe(true);
    expect(hasUnit(-1)).toBe(false);
    expect(hasUnit(4)).toBe(true);
    expect(hasUnit(5)).toBe(false);
  });

  test('scrolls the anchor unit to the top on mount', () => {
    render(<Harness anchor={10} />);
    expect(container().scrollTop).toBe(300); // unit 10 is the 4th unit of the 7..13 window
  });

  test('keeps scrollOffset px above the unit when scrolling to it', () => {
    render(<Harness anchor={10} scrollOffset={28} />);
    expect(container().scrollTop).toBe(272);
  });

  test('an external anchor inside the window just scrolls; one outside resets the window', () => {
    const { rerender } = render(<Harness anchor={10} />);
    rerender(<Harness anchor={11} />);
    expect(container().scrollTop).toBe(400);
    expect(hasUnit(6)).toBe(false);

    rerender(<Harness anchor={50} />);
    expect(hasUnit(47)).toBe(true);
    expect(hasUnit(53)).toBe(true);
    expect(hasUnit(13)).toBe(false);
    expect(container().scrollTop).toBe(300);
  });

  test('grows downward when scrolled within one viewport of the bottom', () => {
    render(<AdoptingHarness initial={10} onVisible={vi.fn()} />);
    container().scrollTop = 350; // 700 - 350 - 300 = 50 < 300
    fireEvent.scroll(container());
    expect(hasUnit(16)).toBe(true);
    expect(hasUnit(17)).toBe(false);
  });

  test('grows upward and compensates scrollTop by the added height', () => {
    render(<AdoptingHarness initial={10} onVisible={vi.fn()} />);
    container().scrollTop = 100; // 100 < 300, and 700 - 100 - 300 = 300 is not near the bottom
    fireEvent.scroll(container());
    expect(hasUnit(4)).toBe(true);
    expect(container().scrollTop).toBe(400); // 100 + (1000 - 700)
  });

  test('does not grow past the bounds', () => {
    render(<AdoptingHarness initial={1} onVisible={vi.fn()} />);
    container().scrollTop = 0;
    fireEvent.scroll(container());
    expect(hasUnit(-1)).toBe(false);
  });

  test('reports the unit at the top of the view once per change', () => {
    const onVisible = vi.fn();
    render(<AdoptingHarness initial={10} onVisible={onVisible} />);
    fireEvent.scroll(container()); // the browser's scroll event after the initial programmatic scroll
    expect(onVisible).not.toHaveBeenCalled(); // unit 10 is the anchor itself

    container().scrollTop = 500;
    fireEvent.scroll(container());
    expect(onVisible).toHaveBeenCalledTimes(1);
    expect(onVisible).toHaveBeenCalledWith(12);

    fireEvent.scroll(container());
    expect(onVisible).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "app/lib/use-scroll-window.test.tsx"`
Expected: FAIL — cannot resolve `@/app/lib/use-scroll-window`.

- [ ] **Step 3: Implement `app/lib/use-scroll-window.ts`**

```ts
'use client';

import { useLayoutEffect, useRef, useState, type UIEvent } from 'react';

export interface UseScrollWindowOptions {
  /** The unit index the parent wants in view. */
  anchor: number;
  /** Lowest and highest unit index that may be rendered (inclusive). */
  min: number;
  max: number;
  /** Units rendered before/after the anchor initially, and added on each extension. */
  span: number;
  /** Pixels kept above a unit's top edge when scrolling to it (e.g. a sticky header's height). */
  scrollOffset?: number;
  /** Called when a different unit becomes the one at the top of the view. */
  onVisibleChange?: (index: number) => void;
}

// A unit counts as "at the top" while its bottom edge is below this many px under the container's top.
const PROBE_PX = 80;

function windowAround(anchor: number, span: number, min: number, max: number) {
  return { start: Math.max(min, anchor - span), end: Math.min(max, anchor + span) };
}

/**
 * Windowed, growable vertical scroll over integer "units" (months or years).
 * Consumers render one element per unit in `start..end` (ascending) as direct
 * children of the container, each tagged `data-unit={index}`.
 */
export function useScrollWindow({ anchor, min, max, span, scrollOffset = 0, onVisibleChange }: UseScrollWindowOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const restore = useRef<{ height: number; top: number } | null>(null);
  const [range, setRange] = useState(() => windowAround(anchor, span, min, max));
  const [synced, setSynced] = useState(anchor);
  const [scrollTarget, setScrollTarget] = useState({ index: anchor });

  // The parent moved the anchor (arrows, picker, Today...): recenter if needed and scroll to it.
  // A unit the hook itself reported as visible is already synced, so it never re-scrolls.
  if (anchor !== synced) {
    setSynced(anchor);
    if (anchor < range.start || anchor > range.end) setRange(windowAround(anchor, span, min, max));
    setScrollTarget({ index: anchor });
  }

  useLayoutEffect(() => {
    const el = containerRef.current;
    const target = el?.querySelector<HTMLElement>(`[data-unit="${scrollTarget.index}"]`);
    if (!el || !target) return;
    el.scrollTop = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - scrollOffset;
  }, [scrollTarget, scrollOffset]);

  // Units were added above the viewport: keep what the user was looking at in place
  // (iOS Safari has no scroll anchoring).
  useLayoutEffect(() => {
    const el = containerRef.current;
    const saved = restore.current;
    if (!el || !saved) return;
    restore.current = null;
    el.scrollTop = saved.top + (el.scrollHeight - saved.height);
  }, [range.start]);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const nearTop = el.scrollTop < el.clientHeight;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < el.clientHeight;
    if (nearTop && range.start > min) {
      restore.current = { height: el.scrollHeight, top: el.scrollTop };
      setRange((r) => ({ ...r, start: Math.max(min, r.start - span) }));
    }
    if (nearBottom && range.end < max) {
      setRange((r) => ({ ...r, end: Math.min(max, r.end + span) }));
    }

    const probe = el.getBoundingClientRect().top + PROBE_PX;
    for (const unit of el.querySelectorAll<HTMLElement>('[data-unit]')) {
      if (unit.getBoundingClientRect().bottom > probe) {
        const index = Number(unit.dataset.unit);
        if (index !== synced) {
          setSynced(index);
          onVisibleChange?.(index);
        }
        break;
      }
    }
  }

  return { containerRef, onScroll, start: range.start, end: range.end };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "app/lib/use-scroll-window.test.tsx"` — Expected: all PASS. If a test fails because of a jsdom stubbing detail (for example the `clientHeight`/`scrollHeight` spies not applying), fix the stub, not the assertion; if an expectation looks wrong against the contract above, stop and report NEEDS_CONTEXT.
Run: `npx tsc --noEmit` and `npm run lint` — Expected: clean (in particular no React Compiler ref-during-render errors and no `react-hooks` errors).

- [ ] **Step 5: Sync the spec**

In `docs/superpowers/specs/2026-09-23-swipe-tiers-and-continuous-calendar-design.md` edit the two sentences that mention `IntersectionObserver` (the `use-scroll-window.ts` bullet under "Units" and the jsdom sentence under "Tests"): the hook detects "near an edge" from the scroll position (`scrollTop` vs `clientHeight` / `scrollHeight`) instead of edge sentinels, and the tests stub layout (`clientHeight`, `scrollHeight`, `getBoundingClientRect`) instead of injecting a fake `IntersectionObserver`. Also in the "Scroll window" bullet replace "when an edge sentinel comes within ~1 screen" with "when the scroll position comes within ~1 screen of an edge". Make no other spec changes.

- [ ] **Step 6: Commit**

```bash
git add app/lib/use-scroll-window.ts app/lib/use-scroll-window.test.tsx docs/superpowers/specs/2026-09-23-swipe-tiers-and-continuous-calendar-design.md
git commit -m "$(cat <<'EOF'
feat: add useScrollWindow hook for growable, jumpable unit scrolling

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

---

## Task 4: Jump picker and header title button

**Files:**
- Create: `app/(app)/calendar/calendar-jump-picker.tsx`
- Create: `app/(app)/calendar/calendar-jump-picker.test.tsx`
- Modify: `app/(app)/calendar/calendar-header.tsx` (full rewrite)
- Modify: `app/(app)/calendar/calendar-header.test.tsx` (append a `describe`)
- Modify: `app/(app)/calendar/calendar-board.tsx` (pass `picker` to `<CalendarHeader`)
- Modify: `app/(app)/calendar/calendar-board.test.tsx` (extend the `@testing-library/react` import with `within`; append a `describe`)
- Modify: `app/styles/layout.css` (append `.pw-jump*` rules at the end of the file)

**Interfaces:**
- Consumes: `clampYear`, `firstOfMonthKey`, `firstOfYearKey`, `yearOfDateKey` from `@/app/lib/calendar-units` (Task 2); `IconButton` (`variant`, `onClick`, `label`, children) and `Icon` (`name`, `size`) as already used in `calendar-header.tsx`.
- Produces: `CalendarJumpPicker({ mode: 'month' | 'year'; value: string; onPick: (dateKey: string) => void; onClose: () => void })`; `CalendarHeaderProps.picker?: { mode: 'month' | 'year'; value: string; onPick: (dateKey: string) => void }`. `onPick` receives `YYYY-MM-01` (month mode) or `YYYY-01-01` (year mode).

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/calendar/calendar-jump-picker.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CalendarJumpPicker } from './calendar-jump-picker';

describe('CalendarJumpPicker (month mode)', () => {
  test('shows the current year and 12 month buttons', () => {
    render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Jump to date' })).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toHaveValue('2026');
    for (const label of ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Go' })).not.toBeInTheDocument();
  });

  test('picking a month uses the year in the field', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mar' }));
    expect(onPick).toHaveBeenCalledWith('2026-03-01');

    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2030');
    await userEvent.click(screen.getByRole('button', { name: 'Jan' }));
    expect(onPick).toHaveBeenLastCalledWith('2030-01-01');
  });

  test('the year buttons step the year, and out-of-range years are clamped to 1900–2100', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next year' }));
    expect(screen.getByLabelText('Year')).toHaveValue('2027');
    await userEvent.click(screen.getByRole('button', { name: 'Previous year' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous year' }));
    expect(screen.getByLabelText('Year')).toHaveValue('2025');

    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '1800');
    await userEvent.click(screen.getByRole('button', { name: 'Jun' }));
    expect(onPick).toHaveBeenLastCalledWith('1900-06-01');

    await userEvent.clear(year);
    await userEvent.type(year, '2500');
    await userEvent.click(screen.getByRole('button', { name: 'Jun' }));
    expect(onPick).toHaveBeenLastCalledWith('2100-06-01');
  });

  test('month buttons are disabled while the year field is not a number', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText('Year'));
    expect(screen.getByRole('button', { name: 'Jan' })).toBeDisabled();
  });

  test('Escape and a backdrop click close it', async () => {
    const onClose = vi.fn();
    const { container } = render(<CalendarJumpPicker mode="month" value="2026-09-23" onPick={vi.fn()} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(container.querySelector('.pw-jump-backdrop') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('CalendarJumpPicker (year mode)', () => {
  test('has no month buttons; Go picks January 1 of the typed year', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="year" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Jan' })).not.toBeInTheDocument();
    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2031');
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onPick).toHaveBeenCalledWith('2031-01-01');
  });

  test('pressing Enter in the year field also picks', async () => {
    const onPick = vi.fn();
    render(<CalendarJumpPicker mode="year" value="2026-09-23" onPick={onPick} onClose={vi.fn()} />);
    const year = screen.getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2040{Enter}');
    expect(onPick).toHaveBeenCalledWith('2040-01-01');
  });
});
```

Append to `app/(app)/calendar/calendar-header.test.tsx`:

```tsx
describe('CalendarHeader picker', () => {
  test('without a picker the title is plain text, not a button', () => {
    render(<CalendarHeader title="September 2026" onPrev={vi.fn()} onToday={vi.fn()} onNext={vi.fn()} onNewTask={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /September 2026/ })).not.toBeInTheDocument();
  });

  test('with a picker the title is a button that opens the jump dialog and closes after picking', async () => {
    const onPick = vi.fn();
    render(
      <CalendarHeader
        title="September 2026"
        onPrev={vi.fn()}
        onToday={vi.fn()}
        onNext={vi.fn()}
        onNewTask={vi.fn()}
        picker={{ mode: 'month', value: '2026-09-23', onPick }}
      />
    );
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /September 2026/ }));
    expect(screen.getByRole('dialog', { name: 'Jump to date' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Feb' }));
    expect(onPick).toHaveBeenCalledWith('2026-02-01');
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
  });
});
```

In `app/(app)/calendar/calendar-board.test.tsx` change the first import line to include `within`:

```tsx
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
```

and append at the end of the file:

```tsx
describe('CalendarBoard jump picker', () => {
  test('in Month view the title opens a picker that jumps to any month and year', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    await userEvent.click(screen.getByRole('button', { name: /September 2026/ }));
    const dialog = screen.getByRole('dialog', { name: 'Jump to date' });
    const year = within(dialog).getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2030');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Feb' }));
    expect(screen.getByRole('button', { name: /February 2030/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
  }, 10000);

  test('in Year view the picker jumps to a year', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Year' }));
    await userEvent.click(screen.getByRole('button', { name: '2026' }));
    const dialog = screen.getByRole('dialog', { name: 'Jump to date' });
    const year = within(dialog).getByLabelText('Year');
    await userEvent.clear(year);
    await userEvent.type(year, '2031');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Go' }));
    expect(screen.getByRole('button', { name: '2031' })).toBeInTheDocument();
  }, 10000);

  test('in Day view the title is plain text', () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    expect(screen.queryByRole('dialog', { name: 'Jump to date' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Today').find((el) => el.tagName === 'SPAN')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "app/(app)/calendar/calendar-jump-picker.test.tsx" "app/(app)/calendar/calendar-header.test.tsx" "app/(app)/calendar/calendar-board.test.tsx"`
Expected: FAIL — `./calendar-jump-picker` does not exist; the header has no `picker` prop; the board tests cannot find a title button.

- [ ] **Step 3: Implement**

Create `app/(app)/calendar/calendar-jump-picker.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { MAX_YEAR, MIN_YEAR, clampYear, firstOfMonthKey, firstOfYearKey, yearOfDateKey } from '@/app/lib/calendar-units';

export interface CalendarJumpPickerProps {
  mode: 'month' | 'year';
  /** The date key the calendar is currently on. */
  value: string;
  /** Receives YYYY-MM-01 in month mode and YYYY-01-01 in year mode. */
  onPick: (dateKey: string) => void;
  onClose: () => void;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CalendarJumpPicker({ mode, value, onPick, onClose }: CalendarJumpPickerProps) {
  const [yearText, setYearText] = useState(String(yearOfDateKey(value)));
  const currentYear = yearOfDateKey(value);
  const currentMonth = Number(value.slice(5, 7)) - 1;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const parsed = Number.parseInt(yearText, 10);
  const year = Number.isFinite(parsed) ? clampYear(parsed) : null;

  function stepYear(delta: number) {
    setYearText(String(clampYear((year ?? currentYear) + delta)));
  }

  return (
    <>
      <div className="pw-jump-backdrop" onClick={onClose} />
      <div className="pw-jump" role="dialog" aria-label="Jump to date">
        <div className="pw-jump-year">
          <IconButton variant="outline" onClick={() => stepYear(-1)} label="Previous year">
            <Icon name="left" size={14} />
          </IconButton>
          <input
            className="pw-jump-input"
            aria-label="Year"
            inputMode="numeric"
            value={yearText}
            onChange={(event) => setYearText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && mode === 'year' && year !== null) onPick(firstOfYearKey(year));
            }}
          />
          <IconButton variant="outline" onClick={() => stepYear(1)} label="Next year">
            <Icon name="right" size={14} />
          </IconButton>
        </div>
        <div className="pw-jump-hint">
          {MIN_YEAR}–{MAX_YEAR}
        </div>
        {mode === 'month' ? (
          <div className="pw-jump-months">
            {MONTH_LABELS.map((label, month) => (
              <button
                key={label}
                type="button"
                data-on={year === currentYear && month === currentMonth ? '1' : '0'}
                disabled={year === null}
                onClick={() => year !== null && onPick(firstOfMonthKey(year * 12 + month))}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" className="pw-jump-go" disabled={year === null} onClick={() => year !== null && onPick(firstOfYearKey(year))}>
            Go
          </button>
        )}
      </div>
    </>
  );
}
```

Replace all of `app/(app)/calendar/calendar-header.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { CalendarJumpPicker } from './calendar-jump-picker';

export interface CalendarHeaderPicker {
  mode: 'month' | 'year';
  value: string;
  onPick: (dateKey: string) => void;
}

export interface CalendarHeaderProps {
  title: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onNewTask: () => void;
  picker?: CalendarHeaderPicker;
}

const TITLE_STYLE = {
  fontFamily: 'var(--font-display)',
  fontWeight: 'var(--weight-semibold)',
  fontSize: 'var(--text-lg)',
} as const;

export function CalendarHeader({ title, onPrev, onToday, onNext, onNewTask, picker }: CalendarHeaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

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
      {picker ? (
        <span style={{ position: 'relative' }}>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
            style={{ ...TITLE_STYLE, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
          >
            {title} <span aria-hidden="true">▾</span>
          </button>
          {pickerOpen && (
            <CalendarJumpPicker
              mode={picker.mode}
              value={picker.value}
              onPick={(dateKey) => {
                picker.onPick(dateKey);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </span>
      ) : (
        <span style={TITLE_STYLE}>{title}</span>
      )}
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

`app/(app)/calendar/calendar-board.tsx` — add a `picker` prop to the `<CalendarHeader ... />` element (after `onNewTask={handleNewTask}`):

```tsx
        picker={calView === 'month' || calView === 'year' ? { mode: calView, value: calDate, onPick: setCalDate } : undefined}
```

Append to the end of `app/styles/layout.css`:

```css
.pw-jump-backdrop { position: fixed; inset: 0; z-index: 30; }
.pw-jump { position: absolute; top: calc(100% + 6px); left: 0; z-index: 31; width: 260px; max-width: calc(100vw - 32px); display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); box-shadow: var(--shadow-lg); }
.pw-jump-year { display: flex; align-items: center; gap: var(--space-2); }
.pw-jump-input { flex: 1; min-width: 0; text-align: center; font-family: var(--font-mono); font-size: var(--text-md); padding: 6px 8px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface-2); color: var(--text-primary); }
.pw-jump-hint { text-align: center; font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--text-faint); }
.pw-jump-months { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-1); }
.pw-jump-months button, .pw-jump-go { appearance: none; border: 1px solid var(--border); background: transparent; color: var(--text-secondary); font-family: var(--font-sans); font-weight: var(--weight-medium); font-size: var(--text-xs); padding: 8px 4px; border-radius: var(--radius-md); cursor: pointer; }
.pw-jump-months button:hover:not(:disabled), .pw-jump-go:hover:not(:disabled) { color: var(--text-primary); background: var(--surface-3); }
.pw-jump-months button[data-on="1"] { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }
.pw-jump-months button:disabled, .pw-jump-go:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar"` — Expected: all PASS.
Run: `npm test`, `npx tsc --noEmit`, `npm run lint` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/calendar/calendar-jump-picker.tsx" "app/(app)/calendar/calendar-jump-picker.test.tsx" "app/(app)/calendar/calendar-header.tsx" "app/(app)/calendar/calendar-header.test.tsx" "app/(app)/calendar/calendar-board.tsx" "app/(app)/calendar/calendar-board.test.tsx" app/styles/layout.css
git commit -m "$(cat <<'EOF'
feat: add month/year jump picker to the calendar header title

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

---

## Task 5: Continuous Month view

**Files:**
- Modify: `app/(app)/calendar/month-view.tsx` (full rewrite)
- Modify: `app/(app)/calendar/month-view.test.tsx` (full rewrite)
- Modify: `app/(app)/calendar/calendar-board.tsx`
- Modify: `app/(app)/calendar/calendar-board.test.tsx` (append a `describe`)
- Modify: `app/(app)/calendar/calendar-views.ts` (delete `buildMonthCells`)
- Modify: `app/(app)/calendar/calendar-views.test.ts` (delete the `describe('buildMonthCells'` block and any imports that become unused)
- Modify: `app/styles/layout.css` (append month rules)

**Interfaces:**
- Consumes: `useScrollWindow` (Task 3); `monthIndexOfDateKey`, `monthIndexToParts`, `firstOfMonthKey`, `MIN_MONTH_INDEX`, `MAX_MONTH_INDEX` (Task 2); `indexTasksByDate`, `buildMonthWeeks`, `MonthCellData` from `./calendar-views` (Task 2); `monthYearLabel` from `@/app/lib/calendar-dates`.
- Produces: `MonthView({ tasks, anchor, todayKey, onVisibleMonthChange, onCellClick, onTaskOpen, onTaskDragStart, onCellDrop })` where `anchor` is a date key (the month containing it is scrolled into view), `onVisibleMonthChange(dateKey)` gets the first day of the month now at the top, and the other four callbacks are unchanged from the old view. Exports `WEEKDAY_ROW_PX = 28`. DOM contract: scroll container `.pw-monthscroll` > `.pw-monthscroll-weekdays` + one `section.pw-monthblock[data-unit=<monthIndex>]` per month, each with `h3.pw-monthblock-title` and `.pw-monthblock-grid` of `.pw-monthblock-cell[data-datekey][data-today]` and `.pw-monthblock-blank` slots.

- [ ] **Step 1: Write the failing tests**

Replace all of `app/(app)/calendar/month-view.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { MonthView, type MonthViewProps } from './month-view';
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

function makeProps(overrides: Partial<MonthViewProps> = {}): MonthViewProps {
  return {
    tasks: [],
    anchor: '2026-09-23',
    todayKey: '2026-09-23',
    onVisibleMonthChange: vi.fn(),
    onCellClick: vi.fn(),
    onTaskOpen: vi.fn(),
    onTaskDragStart: vi.fn(),
    onCellDrop: vi.fn(),
    ...overrides,
  };
}

const SEP_2026 = 2026 * 12 + 8;

describe('MonthView', () => {
  test('renders a heading per month: the anchor month plus 6 months either side', () => {
    render(<MonthView {...makeProps()} />);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    expect(screen.getByText('March 2027')).toBeInTheDocument();
    expect(screen.queryByText('February 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('April 2027')).not.toBeInTheDocument();
  });

  test('renders one sticky weekday row, not one per month', () => {
    render(<MonthView {...makeProps()} />);
    for (const w of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getAllByText(w)).toHaveLength(1);
    }
  });

  test('each month block only contains its own days, with blank slots around them', () => {
    const { container } = render(<MonthView {...makeProps()} />);
    const sept = container.querySelector(`section[data-unit="${SEP_2026}"]`) as HTMLElement;
    expect(sept.querySelectorAll('[data-datekey]')).toHaveLength(30);
    expect(sept.querySelectorAll('.pw-monthblock-blank')).toHaveLength(5); // 5 rows x 7 slots - 30 days
    // No date appears twice across the whole scroll.
    const keys = Array.from(container.querySelectorAll('[data-datekey]')).map((el) => el.getAttribute('data-datekey'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('marks today', () => {
    const { container } = render(<MonthView {...makeProps()} />);
    expect(container.querySelector('[data-datekey="2026-09-23"]')).toHaveAttribute('data-today', 'true');
    expect(container.querySelector('[data-datekey="2026-09-24"]')).toHaveAttribute('data-today', 'false');
  });

  test('renders up to 3 chips and a "+N more" label', () => {
    const tasks = ['A', 'B', 'C', 'D', 'E'].map((text, i) => makeTask({ id: `t${i}`, text, due: '2026-09-10' }));
    render(<MonthView {...makeProps({ tasks })} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByText('D')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  test('clicking an empty part of a cell calls onCellClick with its date', async () => {
    const props = makeProps();
    const { container } = render(<MonthView {...props} />);
    await userEvent.click(container.querySelector('[data-datekey="2026-09-10"]') as HTMLElement);
    expect(props.onCellClick).toHaveBeenCalledWith('2026-09-10');
  });

  test('clicking a chip calls onTaskOpen but not onCellClick', () => {
    const chip = makeTask({ id: 't1', text: 'A', due: '2026-09-10' });
    const props = makeProps({ tasks: [chip] });
    render(<MonthView {...props} />);
    fireEvent.click(screen.getByText('A'));
    expect(props.onTaskOpen).toHaveBeenCalledWith(chip);
    expect(props.onCellClick).not.toHaveBeenCalled();
  });

  test('dragging a chip onto another cell calls onTaskDragStart then onCellDrop for that cell', () => {
    const chip = makeTask({ id: 't1', text: 'A', due: '2026-09-10' });
    const props = makeProps({ tasks: [chip] });
    const { container } = render(<MonthView {...props} />);
    fireEvent.dragStart(screen.getByText('A'));
    expect(props.onTaskDragStart).toHaveBeenCalledWith(chip);
    fireEvent.drop(container.querySelector('[data-datekey="2026-09-15"]') as HTMLElement);
    expect(props.onCellDrop).toHaveBeenCalledWith('2026-09-15');
  });

  test('reports the month at the top of the view when scrolled', () => {
    const OCT_2026 = 2026 * 12 + 9;
    const props = makeProps();
    const { container } = render(<MonthView {...props} />);
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.unit === undefined) return { top: 0, bottom: 600, left: 0, right: 0, width: 0, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      const top = (Number(this.dataset.unit) - OCT_2026) * 500; // October starts at the top; September ends there
      return { top, bottom: top + 500, left: 0, right: 0, width: 0, height: 500, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    fireEvent.scroll(container.querySelector('.pw-monthscroll') as HTMLElement);
    spy.mockRestore();
    expect(props.onVisibleMonthChange).toHaveBeenCalledWith('2026-10-01');
  });
});
```

In `app/(app)/calendar/calendar-board.test.tsx` append:

```tsx
describe('CalendarBoard continuous Month view', () => {
  test('scrolling to another month updates the header title', async () => {
    const OCT_2026 = 2026 * 12 + 9;
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    expect(screen.getByRole('button', { name: /September 2026/ })).toBeInTheDocument();
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.unit === undefined) return { top: 0, bottom: 600, left: 0, right: 0, width: 0, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      const top = (Number(this.dataset.unit) - OCT_2026) * 500;
      return { top, bottom: top + 500, left: 0, right: 0, width: 0, height: 500, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    fireEvent.scroll(container.querySelector('.pw-monthscroll') as HTMLElement);
    spy.mockRestore();
    expect(await screen.findByRole('button', { name: /October 2026/ })).toBeInTheDocument();
  }, 10000);

  test('Next moves the title to the following month', async () => {
    render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Month' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: /October 2026/ })).toBeInTheDocument();
  }, 10000);
});
```

Delete the `describe('buildMonthCells', ...)` block (about lines 69–91) from `app/(app)/calendar/calendar-views.test.ts` and remove `buildMonthCells` and `buildMonthGrid` from its imports if nothing else in that file uses them.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "app/(app)/calendar/month-view.test.tsx" "app/(app)/calendar/calendar-board.test.tsx"`
Expected: FAIL — the old `MonthView` takes `cells`, not `tasks`/`anchor`; there is no `.pw-monthscroll`.

- [ ] **Step 3: Implement**

Replace all of `app/(app)/calendar/month-view.tsx`:

```tsx
'use client';

import { PRIORITY_COLORS } from '@/app/components/ui/priority-flag';
import { monthYearLabel } from '@/app/lib/calendar-dates';
import { MAX_MONTH_INDEX, MIN_MONTH_INDEX, firstOfMonthKey, monthIndexOfDateKey, monthIndexToParts } from '@/app/lib/calendar-units';
import { useScrollWindow } from '@/app/lib/use-scroll-window';
import { buildMonthWeeks, indexTasksByDate } from './calendar-views';
import type { TaskDTO } from './queries';

export interface MonthViewProps {
  tasks: TaskDTO[];
  /** A date key; the month containing it is scrolled into view. */
  anchor: string;
  todayKey: string;
  /** Called with the first day of the month that is now at the top of the view. */
  onVisibleMonthChange: (dateKey: string) => void;
  onCellClick: (dateKey: string) => void;
  onTaskOpen: (task: TaskDTO) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onCellDrop: (dateKey: string) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SPAN = 6;
/** Height of the sticky weekday row; keep in sync with `.pw-monthscroll-weekdays` in layout.css. */
export const WEEKDAY_ROW_PX = 28;

export function MonthView({ tasks, anchor, todayKey, onVisibleMonthChange, onCellClick, onTaskOpen, onTaskDragStart, onCellDrop }: MonthViewProps) {
  const taskIndex = indexTasksByDate(tasks);
  const { containerRef, onScroll, start, end } = useScrollWindow({
    anchor: monthIndexOfDateKey(anchor),
    min: MIN_MONTH_INDEX,
    max: MAX_MONTH_INDEX,
    span: MONTH_SPAN,
    scrollOffset: WEEKDAY_ROW_PX,
    onVisibleChange: (index) => onVisibleMonthChange(firstOfMonthKey(index)),
  });

  const months: number[] = [];
  for (let index = start; index <= end; index++) months.push(index);

  return (
    <div ref={containerRef} onScroll={onScroll} className="pw-monthscroll pw-scroll">
      <div className="pw-monthscroll-weekdays">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      {months.map((index) => {
        const { year, month } = monthIndexToParts(index);
        const weeks = buildMonthWeeks(taskIndex, year, month);
        return (
          <section key={index} data-unit={index} className="pw-monthblock">
            <h3 className="pw-monthblock-title">{monthYearLabel(firstOfMonthKey(index))}</h3>
            <div className="pw-monthblock-grid">
              {weeks.flat().map((cell, slot) =>
                cell === null ? (
                  <div key={`blank-${slot}`} className="pw-monthblock-blank" />
                ) : (
                  <div
                    key={cell.dateKey}
                    className="pw-monthblock-cell"
                    data-datekey={cell.dateKey}
                    data-today={cell.dateKey === todayKey}
                    onClick={() => onCellClick(cell.dateKey)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      onCellDrop(cell.dateKey);
                    }}
                  >
                    <span className="pw-monthblock-daynum">{Number(cell.dateKey.slice(-2))}</span>
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
                      <span
                        onClick={(event) => event.stopPropagation()}
                        style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
                      >
                        +{cell.moreCount} more
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

Append to the end of `app/styles/layout.css`:

```css
.pw-monthscroll { flex: 1; min-height: 0; overflow-y: auto; padding: 0 clamp(16px, 3vw, 32px) 24px; }
.pw-monthscroll-weekdays { position: sticky; top: 0; z-index: 3; height: 28px; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 1px; align-items: center; background: var(--bg); }
.pw-monthscroll-weekdays span { text-align: center; font-size: var(--text-2xs); color: var(--text-muted); }
.pw-monthblock { margin-top: var(--space-6); }
.pw-monthblock-title { position: sticky; top: 28px; z-index: 2; margin: 0; padding: 8px 0 6px; background: var(--bg); border-bottom: 1px solid var(--border); font-family: var(--font-display); font-weight: var(--weight-semibold); font-size: var(--text-lg); }
.pw-monthblock-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 1px; padding-top: var(--space-2); }
.pw-monthblock-cell { min-height: 84px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px; display: flex; flex-direction: column; gap: 2px; cursor: pointer; }
.pw-monthblock-cell[data-today="true"] { border-color: var(--accent); }
.pw-monthblock-daynum { font-size: var(--text-xs); font-family: var(--font-mono); }
.pw-monthblock-cell[data-today="true"] .pw-monthblock-daynum { color: var(--accent); font-weight: var(--weight-semibold); }
@media (max-width: 560px) {
  .pw-monthblock-cell { min-height: 64px; }
}
```

`app/(app)/calendar/calendar-board.tsx`:

1. Remove `buildMonthCells` from the `'./calendar-views'` import. Add `import { monthIndexOfDateKey } from '@/app/lib/calendar-units';`.
2. Delete the `const monthCells = calView === 'month' ? buildMonthCells(tasks, buildMonthGrid(year, month0)) : [];` line. Replace `const [yearStr, monthStr] = calDate.split('-'); const year = Number(yearStr); const month0 = Number(monthStr) - 1;` with `const [yearStr] = calDate.split('-'); const year = Number(yearStr);` (`year` is still used by the Year view until Task 6).
3. After `handleToday`, add:

```tsx
  function handleVisibleMonthChange(dateKey: string) {
    setCalDate((prev) => (monthIndexOfDateKey(prev) === monthIndexOfDateKey(dateKey) ? prev : dateKey));
  }
```

4. Replace the `<MonthView ... />` element with:

```tsx
        <MonthView
          tasks={tasks}
          anchor={calDate}
          todayKey={today}
          onVisibleMonthChange={handleVisibleMonthChange}
          onCellClick={handleCellClick}
          onTaskOpen={handleOpenTask}
          onTaskDragStart={(task) => setDragTaskId(task.id)}
          onCellDrop={handleMonthCellDrop}
        />
```

`app/(app)/calendar/calendar-views.ts` — delete the `buildMonthCells` function (keep `MonthCellData`, which `buildMonthWeeks` uses) and remove the `MonthGridCell` type import if it becomes unused.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar"` — Expected: all PASS, including the existing board tests "switching to Month view shows the task as a chip" and "dragging a task in Month view onto another cell reschedules it".
Run: `npm test`, `npx tsc --noEmit`, `npm run lint` — Expected: clean (no unused imports/variables left behind in the board or views).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/calendar" app/styles/layout.css
git commit -m "$(cat <<'EOF'
feat: continuous scrolling Month calendar with per-month headings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

---

## Task 6: Continuous Year view and final verification

**Files:**
- Modify: `app/(app)/calendar/year-view.tsx` (full rewrite)
- Modify: `app/(app)/calendar/year-view.test.tsx` (full rewrite)
- Modify: `app/(app)/calendar/calendar-board.tsx`
- Modify: `app/(app)/calendar/calendar-board.test.tsx` (append a `describe`)
- Modify: `app/styles/layout.css` (replace the year-view rules — locate them by selector)

**Interfaces:**
- Consumes: `useScrollWindow` (Task 3); `MIN_YEAR`, `MAX_YEAR`, `firstOfYearKey`, `yearOfDateKey` (Task 2); `indexTasksByDate` and `dayColor` from `./calendar-views`; `buildMonthGrid` from `@/app/lib/calendar-dates`.
- Produces: `YearView({ tasks, anchor, todayKey, onVisibleYearChange, onMonthOpen })` where `anchor` is a date key, `onVisibleYearChange(dateKey)` gets January 1 of the year now at the top, `onMonthOpen(year, month0)` is unchanged. DOM contract: scroll container `.pw-yearscroll` > one `section.pw-yearblock[data-unit=<year>]` per year, each with `h3.pw-yearblock-title` and a `.pw-yearview` grid of 12 `.pw-yearview-card` (each with a `button.pw-yearview-label` and 42 `[data-datekey]` day cells).
- `YearMonthData` is no longer exported.

- [ ] **Step 1: Write the failing tests**

Replace all of `app/(app)/calendar/year-view.test.tsx`:

```tsx
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { YearView, type YearViewProps } from './year-view';
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

function makeProps(overrides: Partial<YearViewProps> = {}): YearViewProps {
  return {
    tasks: [],
    anchor: '2026-09-23',
    todayKey: '2026-09-23',
    onVisibleYearChange: vi.fn(),
    onMonthOpen: vi.fn(),
    ...overrides,
  };
}

const year = (container: HTMLElement, y: number) => container.querySelector(`section[data-unit="${y}"]`) as HTMLElement;

describe('YearView', () => {
  test('renders a heading per year: the anchor year plus 2 years either side', () => {
    render(<YearView {...makeProps()} />);
    for (const y of ['2024', '2025', '2026', '2027', '2028']) {
      expect(screen.getByRole('heading', { name: y })).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { name: '2023' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '2029' })).not.toBeInTheDocument();
  });

  test('each year block has 12 month cards with 42 day cells each', () => {
    const { container } = render(<YearView {...makeProps()} />);
    const block = year(container, 2026);
    expect(block.querySelectorAll('.pw-yearview-card')).toHaveLength(12);
    expect(within(block).getByText('January')).toBeInTheDocument();
    expect(within(block).getByText('December')).toBeInTheDocument();
    expect(block.querySelectorAll('[data-datekey]')).toHaveLength(504);
  });

  test('clicking a month label calls onMonthOpen with that year and month', async () => {
    const props = makeProps();
    const { container } = render(<YearView {...props} />);
    await userEvent.click(within(year(container, 2027)).getByText('March'));
    expect(props.onMonthOpen).toHaveBeenCalledWith(2027, 2);
  });

  test('day cells have no click or drag handlers (Year view has no create/drag)', () => {
    const { container } = render(<YearView {...makeProps({ tasks: [makeTask()] })} />);
    const cell = container.querySelector('[data-datekey="2026-09-01"]') as HTMLElement;
    expect(cell.getAttribute('draggable')).toBeNull();
  });

  test('a day with a prioritized task is colored; an empty day is not', () => {
    const { container } = render(<YearView {...makeProps({ tasks: [makeTask({ due: '2026-09-23', priority: 'RED' })] })} />);
    const busy = container.querySelector('section[data-unit="2026"] [data-datekey="2026-09-23"]') as HTMLElement;
    const empty = container.querySelector('section[data-unit="2026"] [data-datekey="2026-09-24"]') as HTMLElement;
    expect(busy.style.background).not.toBe(empty.style.background);
  });

  test('uses the year-view grid classes so CSS can compact the cards on phones', () => {
    const { container } = render(<YearView {...makeProps()} />);
    expect(container.querySelectorAll('.pw-yearview')).toHaveLength(5);
    expect(container.querySelectorAll('.pw-yearview-label')).toHaveLength(60);
  });

  test('reports the year at the top of the view when scrolled', () => {
    const props = makeProps();
    const { container } = render(<YearView {...props} />);
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.unit === undefined) return { top: 0, bottom: 600, left: 0, right: 0, width: 0, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      const top = (Number(this.dataset.unit) - 2027) * 800; // 2027 starts at the top; 2026 ends there
      return { top, bottom: top + 800, left: 0, right: 0, width: 0, height: 800, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    fireEvent.scroll(container.querySelector('.pw-yearscroll') as HTMLElement);
    spy.mockRestore();
    expect(props.onVisibleYearChange).toHaveBeenCalledWith('2027-01-01');
  });
});
```

Append to `app/(app)/calendar/calendar-board.test.tsx`:

```tsx
describe('CalendarBoard continuous Year view', () => {
  test('scrolling to another year updates the header title', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Year' }));
    expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument();
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.unit === undefined) return { top: 0, bottom: 600, left: 0, right: 0, width: 0, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      const top = (Number(this.dataset.unit) - 2027) * 800;
      return { top, bottom: top + 800, left: 0, right: 0, width: 0, height: 800, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    fireEvent.scroll(container.querySelector('.pw-yearscroll') as HTMLElement);
    spy.mockRestore();
    expect(await screen.findByRole('button', { name: '2027' })).toBeInTheDocument();
  }, 10000);

  test('tapping a month in Year view opens the Month view for that month', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Year' }));
    const block = container.querySelector('section[data-unit="2026"]') as HTMLElement;
    await userEvent.click(within(block).getByText('March'));
    expect(screen.getByRole('tab', { name: 'Month' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /March 2026/ })).toBeInTheDocument();
  }, 10000);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "app/(app)/calendar/year-view.test.tsx" "app/(app)/calendar/calendar-board.test.tsx"`
Expected: FAIL — the old `YearView` takes `months`/`tasksByDate`, and there is no `.pw-yearscroll`.

- [ ] **Step 3: Implement**

Replace all of `app/(app)/calendar/year-view.tsx`:

```tsx
'use client';

import { buildMonthGrid } from '@/app/lib/calendar-dates';
import { MAX_YEAR, MIN_YEAR, firstOfYearKey, yearOfDateKey } from '@/app/lib/calendar-units';
import { useScrollWindow } from '@/app/lib/use-scroll-window';
import { dayColor, indexTasksByDate } from './calendar-views';
import type { TaskDTO } from './queries';

export interface YearViewProps {
  tasks: TaskDTO[];
  /** A date key; the year containing it is scrolled into view. */
  anchor: string;
  todayKey: string;
  /** Called with January 1 of the year that is now at the top of the view. */
  onVisibleYearChange: (dateKey: string) => void;
  onMonthOpen: (year: number, month: number) => void;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const YEAR_SPAN = 2;
const MONTH_NAMES = Array.from({ length: 12 }, (_, m) => new Date(2000, m, 1).toLocaleDateString('en-US', { month: 'long' }));

export function YearView({ tasks, anchor, todayKey, onVisibleYearChange, onMonthOpen }: YearViewProps) {
  const taskIndex = indexTasksByDate(tasks);
  const { containerRef, onScroll, start, end } = useScrollWindow({
    anchor: yearOfDateKey(anchor),
    min: MIN_YEAR,
    max: MAX_YEAR,
    span: YEAR_SPAN,
    onVisibleChange: (y) => onVisibleYearChange(firstOfYearKey(y)),
  });

  const years: number[] = [];
  for (let y = start; y <= end; y++) years.push(y);

  return (
    <div ref={containerRef} onScroll={onScroll} className="pw-yearscroll pw-scroll">
      {years.map((y) => (
        <section key={y} data-unit={y} className="pw-yearblock">
          <h3 className="pw-yearblock-title">{y}</h3>
          <div className="pw-yearview">
            {MONTH_NAMES.map((label, month) => (
              <div key={month} className="pw-yearview-card">
                <button type="button" className="pw-yearview-label" onClick={() => onMonthOpen(y, month)}>
                  {label}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
                  {WEEKDAY_INITIALS.map((w, i) => (
                    <span key={i} style={{ fontSize: '9px', textAlign: 'center', color: 'var(--text-faint)' }}>
                      {w}
                    </span>
                  ))}
                  {buildMonthGrid(y, month).map((cell) => {
                    const dayTasks = cell.inMonth ? (taskIndex.get(cell.dateKey) ?? []) : [];
                    const bg = cell.inMonth ? dayColor(dayTasks) : 'transparent';
                    const isToday = cell.dateKey === todayKey;
                    const hasPriority = dayTasks.some((t) => t.priority);
                    return (
                      <span
                        key={cell.dateKey}
                        data-datekey={cell.dateKey}
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
                        {cell.inMonth ? String(Number(cell.dateKey.slice(-2))) : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

`app/styles/layout.css` — find the year-view rules by selector: the three rules `.pw-yearview { ... }`, `.pw-yearview-card { ... }`, `.pw-yearview-label { ... }` and the `@media (max-width: 860px) { ... }` block right after them that overrides `.pw-yearview`, `.pw-yearview-card` and `.pw-yearview-label`. Replace those four pieces (in the same place in the file) with:

```css
.pw-yearscroll { flex: 1; min-height: 0; overflow-y: auto; padding: 0 clamp(16px, 3vw, 32px) 24px; }
.pw-yearblock { margin-top: var(--space-6); }
.pw-yearblock-title { position: sticky; top: 0; z-index: 2; margin: 0 0 var(--space-3); padding: 8px 0 6px; background: var(--bg); border-bottom: 1px solid var(--border); font-family: var(--font-display); font-weight: var(--weight-semibold); font-size: var(--text-xl); }
.pw-yearview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-4); }
.pw-yearview-card { border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 8px; }
.pw-yearview-label { background: none; border: none; cursor: pointer; font-family: var(--font-display); font-weight: var(--weight-semibold); font-size: var(--text-sm); padding: 0; margin-bottom: 4px; }
@media (max-width: 860px) {
  .pw-yearscroll { padding: 0 16px 24px; }
  .pw-yearview { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); }
  .pw-yearview-card { padding: 6px; border-radius: var(--radius-md); }
  .pw-yearview-label { font-size: var(--text-xs); }
}
```

`app/(app)/calendar/calendar-board.tsx`:

1. Imports: change `import { YearView, type YearMonthData } from './year-view';` to `import { YearView } from './year-view';`; delete `import { useMediaQuery } from '@/app/lib/use-media-query';`; remove `buildMonthGrid` from the `@/app/lib/calendar-dates` import; remove `tasksByDate` from the `'./calendar-views'` import; change the calendar-units import to `import { monthIndexOfDateKey, yearOfDateKey } from '@/app/lib/calendar-units';`.
2. Delete the `const isNarrow = useMediaQuery('(max-width: 860px)');` line, the `const [yearStr] = calDate.split('-'); const year = Number(yearStr);` lines, and the whole `const yearsToShow = ...` and `const yearMonths: YearMonthData[] = ...` declarations.
3. After `handleVisibleMonthChange`, add:

```tsx
  function handleVisibleYearChange(dateKey: string) {
    setCalDate((prev) => (yearOfDateKey(prev) === yearOfDateKey(dateKey) ? prev : dateKey));
  }
```

4. Replace the `<YearView ... />` element with:

```tsx
        <YearView
          tasks={tasks}
          anchor={calDate}
          todayKey={today}
          onVisibleYearChange={handleVisibleYearChange}
          onMonthOpen={(y, m) => {
            setCalDate(`${y}-${String(m + 1).padStart(2, '0')}-01`);
            setCalView('month');
          }}
        />
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "app/(app)/calendar"` — Expected: all PASS.

- [ ] **Step 5: Full verification**

Run each and read the output:
- `npm test` — Expected: every unit test PASSES.
- `npm run lint` — Expected: no errors or warnings in `app/` (errors under `Personal productivity webapp/` are pre-existing).
- `npx tsc --noEmit` — Expected: no errors.
- `npm run build` — Expected: the build succeeds.
Confirm with `git status --short` that only `Personal productivity webapp/` remains untracked and nothing else is uncommitted before the commit below. Make sure no dev/build server process is left running.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/calendar" app/styles/layout.css
git commit -m "$(cat <<'EOF'
feat: continuous scrolling Year calendar with per-year headings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```
