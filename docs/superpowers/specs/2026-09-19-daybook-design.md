# Daybook — design spec

Date: 2026-09-19

## 1. Overview

Daybook is a personal productivity web app covering six features: Tasks (lists),
Eisenhower Matrix, Calendar (time blocking + month/year), Habits (GitHub-streak
style), Journal, and a Dashboard summary. Goals, expense tracking, and a Pomodoro
timer were mentioned as long-term vision but are explicitly **out of scope** for
this build.

The visual design already exists as a design-tool mockup at
`Personal productivity webapp/Productivity Klivr.dc.html`, built on the "Klivr"
design system (`Personal productivity webapp/_ds/klivr-design-system-*/`): dark
near-black surfaces, a single lime accent, Space Grotesk/Geist/JetBrains Mono
type. This spec's job is to reproduce that design exactly with real React
components, and back it with a real multi-device backend (the mockup itself only
persists to a single `localStorage` blob and has no concept of accounts).

## 2. Stack & architecture

- **Next.js 16** (App Router), already scaffolded in this repo. Note the Next 16
  rename: `middleware.ts` is now `proxy.ts` (same capability).
- **Data**: Prisma ORM + Vercel Postgres. All reads happen in Server Components;
  all writes happen via Server Actions (`'use server'`), each independently
  re-checking auth (Server Actions are POST-reachable directly, not just from
  the UI they're wired to).
- **Auth**: single hardcoded account (this is a personal app, not multi-user).
  Credentials live in env vars (`AUTH_EMAIL`, `AUTH_PASSWORD_HASH` — bcrypt).
  Login sets a signed, `httpOnly`, `secure` session cookie (JWT via `jose`,
  7-day expiry). `proxy.ts` does an optimistic redirect-if-missing-cookie check;
  a `verifySession()` helper in a Data Access Layer (`app/lib/dal.ts`) is the
  real gate, called from every Server Action and every data-loading function.
  No signup flow, no password reset, no roles.
- **Styling**: the Klivr design system's CSS is copied into the app as-is
  (`tokens/*.css`, `styles.css`) and linked globally, so colors, radii, shadows,
  and fonts match the mockup exactly. Layout is rebuilt as real React/CSS using
  the same hand-written classes the mockup already defines (`.pw-sidebar`,
  `.pw-bottomnav`, `.pw-board`, `.pw-quadgrid`, `.pw-habit-split`, `.pw-viewpill`,
  scrollbar styling) at the same breakpoints: **860px** (sidebar ↔ bottom nav),
  **900px** (matrix/habit split ↔ stacked), **1100px** (dashboard 3→2 col,
  journal 2→1 col), **560px** (dialog 2-col field row → 1 col). Tailwind (already
  in the project) is used only for incidental utility spacing in new markup, not
  for re-deriving the palette — the CSS variables are the source of truth.
- Shared UI primitives are rebuilt as real components (not the design tool's
  `_ds_bundle.js` runtime, which is canvas-tool-only): `Button`, `IconButton`,
  `Input`, `Select`, `Dialog`, plus the mockup's custom bits — the 20×20
  checkbox-style toggle (shared by tasks and habit "done today"), the priority
  flag icon, and the pill-toggle used for the calendar view-switcher, matrix
  mobile tabs, mood picker, and habit-frequency picker.

## 3. Data model

```prisma
model TaskList {
  id        String   @id @default(cuid())
  name      String
  order     Int
  createdAt DateTime @default(now())
  tasks     Task[]
}

enum Priority { RED AMBER BLUE GREEN }

model Task {
  id        String    @id @default(cuid())
  text      String
  list      TaskList  @relation(fields: [listId], references: [id], onDelete: Cascade)
  listId    String
  priority  Priority?
  due       DateTime? @db.Date
  dueTime   Int?      // minutes since midnight, 0-1439; null = all-day
  duration  Int       @default(60) // minutes
  done      Boolean   @default(false)
  order     Int
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

enum FreqType { DAILY WEEKLY }

model Habit {
  id            String    @id @default(cuid())
  name          String
  color         String    // hex, assigned round-robin from a fixed palette at creation
  freqType      FreqType
  timesPerWeek  Int?      // set only when freqType = WEEKLY
  startDate     DateTime  @db.Date
  order         Int
  createdAt     DateTime  @default(now())
  logs          HabitLog[]
}

model HabitLog {
  id      String   @id @default(cuid())
  habit   Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
  habitId String
  date    DateTime @db.Date

  @@unique([habitId, date])
}

enum Mood { GREAT GOOD OKAY LOW ROUGH }

model JournalEntry {
  id        String   @id @default(cuid())
  date      DateTime @unique @db.Date
  text      String
  mood      Mood     @default(OKAY)
  updatedAt DateTime @updatedAt
}
```

Notes vs. the mockup:
- Eisenhower quadrant is a single `Priority` enum on `Task` (not two urgent/
  important booleans) — matches the mockup exactly.
- `tags` (Task) and `endDate` (Habit) existed in the mockup's mock data but were
  never read anywhere. Dropped from this schema; trivial to add back later.
- `order` is an explicit integer column on `Task`, `TaskList`, and `Habit` since
  Postgres rows have no inherent order — array position in the mockup becomes
  this column, updated on drag-reorder.
- No `CalendarEvent` table — calendar views are entirely a query over `Task`
  (`due` + `dueTime` + `duration`), same as the mockup.
- Single-user app: no `userId` foreign keys anywhere. If multi-user is ever
  wanted, that's a later migration, not a day-one concern.

## 4. Screens

Shared shell: desktop sidebar (collapsible, 220px ↔ 64px) / mobile bottom nav,
6 items — Dashboard, Tasks, Calendar, Matrix, Habits, Journal — plus a
light/dark theme toggle (persisted via cookie or `localStorage`, default dark).

### 4.1 Dashboard (default landing page after login)
3-column grid (2-col ≤1100px, 1-col ≤860px):
- **Tasks**: quick-add input, up to 6 undone tasks sorted by priority rank
  (red > amber > blue > green > none), checkbox toggle inline, click-through to
  edit dialog, "View all" → Tasks. Empty: "Nothing left. Nice work."
- **Today's schedule**: up to 6 of today's tasks (any with `due` = today,
  timed first sorted by time, then untimed), "Open" → Calendar day view on
  today. Empty: "Nothing scheduled yet." + "Schedule something" button.
- **Habits**: up to 4 habits with a "done today" toggle and a weekly-progress
  label ("3/5 this week" for weekly habits, "x/7" for daily). Empty: "No habits
  yet." Below it, a single **Journal** textarea bound directly to today's entry
  (creates the entry with mood = OKAY on first keystroke if it doesn't exist).

### 4.2 Tasks (kanban board)
Horizontally-scrollable columns, one per `TaskList`, plus a trailing "new list"
column. Column header: drag handle (reorder lists), name + task count, add-task
button, delete-list button (cascades — deleting a list deletes its tasks, no
confirmation dialog needed since it's a personal single-user app, but a native
`confirm()` is fine as a lightweight guard). Cards: checkbox, text
(strikethrough if done), priority flag icon, due-date label if set; background
tinted by priority. Drag-and-drop reorders within/across columns and updates
`listId`/`order`. Click card → edit dialog. Empty column: "No tasks."

### 4.3 Eisenhower Matrix
Desktop: 2×2 quadrant grid (65%) + "Unflagged" panel (35%) side by side; ≤900px
stacked; ≤860px a 2-tab pill switcher (Matrix / Unflagged · N) shows one at a
time. Quadrants are fixed: Red = "Urgent & important / Do first", Amber =
"Not urgent but important / Schedule", Blue = "Urgent but unimportant /
Delegate", Green = "Not urgent & unimportant / Eliminate". Unflagged panel =
tasks with `priority = null` and `done = false` (done tasks are excluded from
the whole matrix view, flagged or not). Drag a task onto a quadrant/panel to
set its priority. Desktop uses native HTML5 drag-and-drop; mobile uses a
custom 280ms long-press + touch-move hit-testing implementation (with a short
`navigator.vibrate` tick), since native DnD doesn't fire on touch.

### 4.4 Calendar
Header: title (format depends on view), Prev/Today/Next, "New task" button.
Body is one of 5 views, chosen via a floating bottom pill switcher: **Day**,
**3-Day**, **Week**, **Month**, **Year**, **Agenda**.
- **Day/3-Day/Week**: hourly grid, sticky day headers + hour gutter, full 24h
  range (0–24h, 64px/hour), **week starts Sunday**. Timed tasks render as
  positioned/draggable blocks; dragging updates `due`+`dueTime` (snapped to 15
  min). **New**: an "All day" shelf above the hourly grid lists that day's
  timeless tasks (the mockup omits these entirely from this view — we're fixing
  that gap). Click empty grid → new task dialog prefilled with date + time
  (snapped to nearest 30 min).
- **Month**: 7×6 grid, Sunday-start weeks, up to 3 task chips per cell + "+N
  more", drag a chip to another cell to change its date (time untouched).
  Click empty cell → new task dialog prefilled with date only.
- **Year**: 12 mini month cards; each day cell colored by the highest-priority
  task present that day (red > amber > blue > green), gray if only unflagged
  tasks, transparent if none. Click a month → jump to Month view. On mobile,
  renders 5 years (current ±2) stacked, auto-scrolled to center the current
  year.
- **Agenda**: flat list of all tasks due in the next 60 days, grouped by date;
  the only calendar view showing the priority flag icon per row. Empty:
  "Nothing scheduled in the next 60 days."
- Implementation note (deliberate deviation from the mockup's internals, not
  its visible behavior): the mockup fakes infinite horizontal scroll in
  Day/3-Day/Week with a 35-day virtualization window that silently re-centers.
  The real app instead paginates by the exact visible date range (Prev/Next
  moves the window, no virtualization illusion) — same user-facing result,
  much simpler and more robust code.

### 4.5 Habits
Left: compact list of habit cards (drag to reorder), each with a "done today"
checkbox, name, frequency label, streak flame (if streak > 0), and a
GitHub-style heatmap (7 rows × up to 30 columns desktop / 14 mobile, flowing
week-by-week) — click any past/today cell to toggle that day's log. Right:
detail panel for the selected habit — stat tiles (day streak, total check-ins,
this-month %), edit/delete, and a month calendar picker where logged days are
filled and clickable to toggle. ≤900px stacked; ≤860px master-detail (list or
detail, not both, with a back button). Empty: "No habits yet — add one to
start tracking."

Streak/percent logic (from the mockup, preserved exactly):
- **Day streak**: walk backward from today; if today isn't logged yet, start
  the walk from yesterday instead (so a streak is still "banked" before today's
  check-in).
- **This month %**: daily habits → check-ins this month ÷ days elapsed this
  month; weekly habits → check-ins this month ÷ (weeks elapsed × timesPerWeek),
  capped at 100%.

### 4.6 Journal
One entry per calendar date (no multiple entries/day, no title field). Header:
date label + prev/today/next day nav. Left: mood picker (5 pills — Great/Good/
Okay/Low/Rough) + textarea, bound to whatever date is currently navigated to.
Right (below on mobile, ≤1100px): past entries with non-empty text, newest
first, each a card with date, mood tag, and a ~140-char preview; click to jump
the editor to that date. Empty: "Past entries will show up here."

## 5. Out of scope (this build)

Goals tracking, expense tracking, Pomodoro timer, multi-user accounts/signup,
settings screen (week-start/hour-range/default-view are hardcoded: Sunday
start, full 24h, dashboard is the default landing page), recurring
tasks/events, notifications.

## 6. Rollout plan (phased, one plan with review checkpoints per phase)

1. **Foundation** — Prisma schema + migration, Vercel Postgres wiring, login
   page + `proxy.ts` + DAL + session cookie, copy design-system CSS into the
   app, global shell (sidebar/bottom-nav/theme toggle), shared primitives
   (Button, IconButton, Input, Select, Dialog, checkbox toggle, priority flag,
   pill toggle).
2. **Tasks** — TaskList/Task CRUD server actions, kanban board, drag-and-drop,
   task create/edit dialog.
3. **Eisenhower Matrix** — quadrant + unflagged views over existing Task data,
   desktop DnD + mobile long-press DnD.
4. **Calendar** — Day/3-Day/Week grid (incl. all-day shelf), Month, Year,
   Agenda, view-switcher pill.
5. **Habits** — Habit/HabitLog CRUD, compact list + heatmap, detail panel,
   streak/percent calculations.
6. **Journal** — entry-per-date CRUD, mood picker, history list.
7. **Dashboard** — aggregation widgets over Tasks/Habits/Journal (built last
   since it depends on all the others existing).

Each phase ships independently reviewable and deployable; the app is
functional (if incomplete) after every phase.
