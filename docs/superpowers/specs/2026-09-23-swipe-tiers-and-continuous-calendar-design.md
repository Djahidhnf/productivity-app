# Swipe tiers, rolling week, and continuous Month/Year calendars — Design

Date: 2026-09-23
Builds on: `2026-09-23-mobile-responsive-swipe-design.md` (already implemented)

## Goals

1. Swiping in the calendar grids has two tiers: a short swipe moves 1 day, a long
   swipe moves the view's full step (3 days in 3-Day, 7 days in Week).
2. Month and Year become real, continuous calendars: the user can scroll to any
   month or year, jump to one with a picker, and each month/year is clearly
   separated.

## Decisions (from brainstorming)

- Swipe tiers are distance-based.
- Week view becomes a rolling 7-day window starting at the anchor date (like
  3-Day), so a 1-day shift is visible. It is no longer Sunday-aligned.
- Month and Year: continuous vertical scroll plus a jump picker.
- Swipe is still Day / 3-Day / Week only; Month and Year use native vertical scroll.

## 1. Short vs. long swipe

### Behavior

- A swipe still commits by the existing rule (travel > 25% of grid width, or a
  fast flick > 40px and > 0.5px/ms). Committed swipes split by travel distance:
  - travel < 60% of grid width: **short** — moves 1 day;
  - travel >= 60% of grid width: **long** — moves the full step.
  - A fast flick that does not travel far is short.
- Day view: step is 1 day, so short and long are identical.
- 3-Day: short = 1 day, long = 3 days. Week: short = 1 day, long = 7 days.
- Header prev/next arrows are unchanged: they always move the full step
  (1, 3 or 7 days). The slide animation is the same for both tiers.

### Rolling Week

- Week view shows 7 consecutive days starting at the anchor date
  (`dateKeysForGrid` = `[calDate .. calDate+6]`).
- Its title becomes `shortDateLabel(calDate) – shortDateLabel(calDate + 6)`,
  e.g. anchor Wed Sep 23 → `Sep 23 – Sep 29`.
- `startOfWeekSunday` remains in `calendar-dates.ts` (still used by other code /
  tests) but the Week view no longer uses it.

### Units

- `app/lib/use-swipe.ts`:
  - new constant `LONG_SWIPE_RATIO = 0.6`;
  - new pure function `swipeStrength(dx: number, width: number): 'short' | 'long'`
    (`long` when `|dx| >= width * LONG_SWIPE_RATIO`);
  - `resolveSwipe` is unchanged;
  - `UseSwipeOptions.onSwipeLeft` / `onSwipeRight` become
    `(strength: 'short' | 'long') => void`; `onPointerUp` computes the strength
    from the final `dx` and passes it through `finish`.
- `DayWeekGrid`: `onSwipePrev` / `onSwipeNext` become
  `(strength: 'short' | 'long') => void` and are passed straight to the hook.
- `CalendarBoard`: `handlePrev` / `handleNext` are unchanged (full step, for the
  arrows). New swipe handlers map `(direction, strength)` to a day count:
  `day` → 1; `3day` → 1 (short) or 3 (long); `week` → 1 (short) or 7 (long),
  then call `setCalDate((d) => addDays(d, ±n))`.

### Tests

- `swipeStrength`: below, at and above the 60% boundary, both directions.
- Hook: callbacks receive `'short'` / `'long'` for the right travel distances.
- Board: short swipe moves 1 day; long swipe moves 3 (3-Day) and 7 (Week);
  Day is 1 either way. Existing 200px (50%) swipe tests become short-swipe
  tests; Week title expectations change to the rolling window
  (`Sep 23 – Sep 29`, then after a long swipe `Sep 30 – Oct 6`).

## 2. Continuous Month and Year calendars

### Month view

- One endless vertical scroll, one block per month. Each block has a heading
  (`September 2026`, sticky under the weekday row), a divider line, and extra
  spacing above it.
- One sticky weekday row (Sun–Sat) at the top of the scroll area.
- A block shows only its own days: leading/trailing weekdays are blank
  placeholder cells (no dimmed neighboring-month days, which would duplicate
  dates in a continuous scroll). Fully-empty trailing week rows are dropped.
- Cells keep click-to-create, task chips, "+N more" and drag-to-reschedule.
- Below 560px the cell minimum height drops from 84px to 64px.
- The view uses `buildMonthWeeks` (built on `buildMonthGrid`), which drops
  fully-empty week rows and returns `null` for out-of-month slots. Tasks are
  indexed by date once per render (a `Map<dateKey, TaskDTO[]>`) instead of
  filtering per cell.

### Year view

- One endless vertical stack of years. Each year block has a large sticky year
  heading and a divider above its 12 month cards.
- Month card grid is unchanged from the compact year view: 4 columns above 860px,
  3 columns at 860px and below.
- Tapping a month card opens the Month view scrolled to that month (as today).
- The narrow-screen "5 years stacked" special case in `CalendarBoard` is removed;
  the scroll window replaces it at every width.

### Reaching any month/year

- Scroll window: Month view renders ±6 months around the anchor initially and
  adds 6 when the scroll position comes within ~1 screen of an edge; Year view renders ±2
  years and adds 2. The window only grows during scrolling; a jump (picker,
  Today, arrows beyond the window, tapping a year-view month) resets it centered
  on the target.
- Prepending above compensates `scrollTop` by the added height in a layout effect
  (iOS Safari has no `overflow-anchor`).
- The range is clamped to years 1900–2100 (the window never grows past a bound,
  and the header arrows do not move past it).
- Jump picker: in Month and Year views the header title becomes a button that
  opens a small popover with a year number field (1900–2100, clamped) and, in
  Month view, 12 month buttons. The month buttons / Go are enabled only when the
  year field holds a full four-digit year (values outside 1900–2100 are
  clamped). Choosing sets the anchor and scrolls there; Escape or an outside
  click closes it.
- Arrows: Prev/Next scroll to the previous/next month (Month view) or year
  (Year view); Today scrolls to the current month/year. These keep using the
  existing `addMonths` / `addYears` on `calDate`.
- Header title follows the scroll: it shows the month+year (Month) or year (Year)
  currently at the top of the view. When the visible month/year changes and
  `calDate` is not already inside it, `calDate` is set to the first day of the
  visible month (Month view) or to January 1 of the visible year (Year view).
  If `calDate` is already inside the visible month/year it is left untouched, so
  Day / 3-Day / Week keep a sensible day when the user switches views.
- Avoiding a feedback loop: the view only scrolls programmatically when the
  anchor's month/year differs from the last one it reported as visible.

### Units

- `app/lib/use-scroll-window.ts` (new): owns window size, near-edge detection from
  the scroll position (`scrollTop` vs `clientHeight` / `scrollHeight`, no edge
  sentinels), scrollTop compensation on prepend, scroll-to-anchor and
  visible-unit reporting. Used by both views. It works on integer unit indexes
  (month index = year*12+month, or the year itself) with props `anchor`, `min`,
  `max`, `span`, `scrollOffset` and `onVisibleChange`, so it holds no calendar
  knowledge itself.
- `app/(app)/calendar/month-view.tsx`, `year-view.tsx`: rewritten in place on top
  of the hook.
- `app/(app)/calendar/calendar-jump-picker.tsx` (new): the popover.
- `CalendarHeader`: the title renders as a button (opens the picker) only in
  Month and Year views; otherwise it stays plain text.
- `CalendarBoard`: passes the anchor plus `onVisibleMonthChange` /
  `onVisibleYearChange` callbacks to the two views, drops `yearsToShow` / the eager `yearMonths` build, and switches the
  Week view to the rolling window (Section 1).
- Pure helpers: `app/lib/calendar-units.ts` (`clampYear`, `monthIndexOfDateKey`,
  `monthIndexToParts`, `firstOfMonthKey`, `firstOfYearKey`, `yearOfDateKey`,
  bounds constants), and in `calendar-views.ts` `indexTasksByDate`,
  `buildMonthWeeks`, `swipeStepDays`.

### Tests

- Pure unit tests: window math, empty-row trimming, blank out-of-month cells,
  year clamp, task index.
- Component tests: month headings and blank cells render; year headings and
  12 cards per year; click / drag-to-reschedule still work in Month; tapping a
  year-view month opens Month; picker chooses a month/year and closes on Escape;
  header title follows a simulated visible-change; window extends when the
  stubbed scroll position comes near an edge.
- jsdom has no layout, so tests stub it (`clientHeight`, `scrollHeight`,
  `getBoundingClientRect`) instead of injecting a fake `IntersectionObserver`;
  scroll compensation and sticky stacking can only be confirmed on a real
  device/browser (manual check list).

## Out of scope

- Swipe in Month and Year (native vertical scroll only).
- Virtualizing/unmounting far-away months (the window only grows).
- Agenda view changes.
- Any change to the Day / 3-Day grid layout beyond the swipe tiers.
