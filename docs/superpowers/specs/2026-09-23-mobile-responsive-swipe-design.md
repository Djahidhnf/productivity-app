# Mobile-compatible UI, sidebar removal, and calendar swipe — Design

Date: 2026-09-23

## Goal

Make Daybook fully usable on phones without layout breakage, remove the sidebar
at every width, and let users swipe horizontally to move between days/weeks in
the Calendar's Day, 3-day and Week views.

## Decisions (from brainstorming)

- Navigation: the existing bottom tab bar is the only navigation, at all widths.
- Theme toggle: removed. The saved `daybook_theme` cookie still decides the theme.
- Week view on phones: keep all 7 columns, compact styling, tap a block to open it.
- Year view: compacted for phones (3 columns, tighter spacing), see Section 2.
- Swipe scope: Day, 3-day and Week only. Month, Year and Agenda are unchanged.

## 1. Shell and navigation

- Delete `app/components/shell/sidebar.tsx` and `sidebar.test.tsx`; remove
  `.pw-sidebar` from `app/styles/layout.css`.
- `AppShell` takes only `children`. It no longer holds theme or sidebar state,
  no longer writes the `daybook_theme` / `daybook_sidebar` cookies, and no longer
  sets `data-theme` on its wrapper (the root `<html>` already carries it from
  the cookie, set in `app/layout.tsx`).
- `app/(app)/layout.tsx` stops reading the theme and sidebar cookies.
  The unused `daybook_sidebar` cookie is simply ignored.
- `BottomNav` is visible at every width. Its items sit in an inner container
  capped at ~720px and centered; the bar itself spans the full width and keeps
  the `env(safe-area-inset-bottom)` padding.
- `--pw-bottom` (space reserved for the nav) and the calendar view pill's
  offset above the nav apply at all widths, not only below 860px.
- The main content area is capped in width and centered on large screens.
- Wrapper uses `min-height: 100dvh` (not `100vh`) and `overflow-x: hidden` so
  mobile browser chrome doesn't cause jumps or horizontal scroll.
- `app/layout.tsx` exports a Next `viewport` with `viewportFit: 'cover'` so the
  safe-area inset works on notched iPhones. Check the Next 16 docs in
  `node_modules/next/dist/docs/` for the exact API before writing it
  (per AGENTS.md).
- Responsive audit at 360px, 390px and 768px for Tasks, Calendar, Matrix,
  Habits, Journal, Today (stub) and Login. Fix only what overflows or clips;
  pages that already work are not rewritten. Remove the dead `.pw-cal-scroll`
  rule if nothing uses it.

## 2. Calendar swipe (Day / 3-day / Week)

### Behavior

- Swipe left = next, swipe right = previous.
- Swipes call the same `handlePrev` / `handleNext` as the header arrows, so
  the step is 1, 3 or 7 days. No second date-math path.
- Touch only (`pointerType === 'touch'`). Mouse drags do nothing, so text
  selection and drag-and-drop rescheduling are unaffected.
- Axis lock after ~10px of movement. A vertical gesture is left to normal
  scrolling of the 24-hour grid; only a clearly horizontal one becomes a swipe.
  `.pw-calgrid` gets `touch-action: pan-y`.
- Commit rule: horizontal travel > 25% of grid width, or fast (> 0.5px/ms and
  > 40px). Otherwise it cancels and snaps back.
- While dragging, the day columns follow the finger; the time gutter and the
  sticky header row stay pinned. Implemented via a `--swipe-x` CSS variable set
  on a ref (no React re-render per pointer move) and applied to the day
  columns/header cells so they slide under the sticky gutter.
- On commit: slide out, change date, slide in from the opposite side (~150ms).
  On cancel: snap back. `prefers-reduced-motion` disables the animation.
- After a horizontal swipe the following click is swallowed so it cannot open
  the "create task" dialog. Vertical scroll position is preserved.

### Units

- `app/lib/use-swipe.ts`
  - `resolveSwipe({ dx, dy, dt, width })` — pure function returning
    `'next' | 'prev' | 'cancel' | 'vertical'`.
  - `useSwipe({ onSwipeLeft, onSwipeRight })` — returns a ref and handlers for
    the grid container; owns pointer tracking, axis locking, the `--swipe-x`
    variable and click suppression.
- `DayWeekGrid` gains optional `onSwipePrev` / `onSwipeNext` props and wires
  the hook to its scroll container.
- `CalendarBoard` passes `handlePrev` / `handleNext` for the three grid views.

### Compact week on phones

Below 560px the time gutter shrinks from 56px to ~36px, and hour labels,
header and paddings tighten. Task blocks in narrow columns show single-line
truncated text (ellipsis) on their existing priority-colored background.
Tapping a block opens the task dialog as today.

### Compact year view

`YearView` currently uses a fixed 4-column grid, which leaves ~10px day cells
on a phone. Change it to a responsive grid via a CSS class (in `layout.css`,
replacing the inline `gridTemplateColumns`):

- above 860px: 4 columns, unchanged;
- 860px and below: 3 columns, with tighter grid gap (`--space-2`), page padding
  (16px sides) and month-card padding (6px);
- the month label uses a smaller size, and day numbers keep the 9px size that
  fits ~14px cells at 390px.

Multi-year stacking on narrow screens (5 years x 12 months in `CalendarBoard`)
and tap-a-month-to-open behavior are unchanged. Year view gets no swipe; it
scrolls vertically only.

## 3. Error handling and edge cases

- Multi-touch (a second pointer) cancels the swipe.
- `pointercancel` (browser takes over for scroll) cancels and snaps back.
- A dialog being open does not affect the grid (dialog is outside its container).
- Header buttons remain as the non-touch and accessibility path.

## 4. Testing

- `use-swipe.test.ts`: `resolveSwipe` thresholds (distance, velocity, vertical
  dominance) plus hook tests with simulated pointer events: horizontal commit,
  vertical ignored, mouse ignored, cancel snaps back, click swallowed.
- `day-week-grid.test.tsx`: swipe callbacks fire from the grid.
- `calendar-board.test.tsx`: a swipe moves the title by 1 / 3 / 7 days.
- `year-view.test.tsx`: existing tests still pass with the class-based grid
  (jsdom does not evaluate media queries, so the column counts are verified in
  the manual browser check).
- `app-shell.test.tsx`: updated for no sidebar / no theme toggle; bottom nav
  renders and marks the active item. `sidebar.test.tsx` deleted.
- Manual check in a browser at 360/390/768px and desktop for the audit.

## Out of scope

- Swipe in Month, Year and Agenda views.
- A replacement theme control.
- Redesigning pages that already lay out correctly on mobile.
