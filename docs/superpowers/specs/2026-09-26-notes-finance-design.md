# Notes and Finance (and Journal removal) — Design

Date: 2026-09-26

## Goal

Add the Notes and Finance screens from the "Still App v2" handoff
(`Personal productivity webapp/Still App v2.dc.html`) and remove the Journal
feature entirely, so the navigation matches the mockup's seven destinations.

## Decisions (from brainstorming)

- Journal is removed entirely: code, route, nav item, CSS, and the
  `journal_entries` table **with its data** (no migration into Notes).
- Navigation: Today, Tasks, Calendar, Matrix, Habits, Notes, Finance — all 7
  in both the sidebar and the bottom nav. No "More" menu.
- Currency: Algerian dinar, one hard-coded constant. No currency setting.
- Finance categories: the mockup's fixed lists. No custom categories.
- The mockup's Today-screen Notes / Finance widgets are **out of scope**: the
  Dashboard phase is still deferred and `/dashboard` stays the stub.
- One branch, three phases in order, each leaving the app working:
  1. remove Journal, 2. Notes, 3. Finance.

## Phase 1 — Remove Journal

- Delete `app/(app)/journal/` (all files, including tests) and
  `app/lib/journal-dto.ts`.
- Remove the `journal` entry from `app/components/shell/nav-items.ts`.
- Remove the `/* Journal */` block (`.pw-journal-*`) from `app/styles/layout.css`.
- Update `app/layout.tsx`'s metadata description (drop "journal") and the
  comment in `app/(app)/stub-pages.test.tsx`.
- Prisma migration: drop model `JournalEntry` (table `journal_entries`) and
  enum `Mood`. This permanently deletes existing journal entries.
- Any shell/nav tests that enumerate nav items are updated to the new list.

## Phase 2 — Notes (`/notes`)

### Data

```prisma
model Note {
  id        String   @id @default(cuid())
  text      String
  pinned    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("notes")
}
```

DTO in `app/lib/note-dto.ts`: `{ id, text, pinned, createdAt: string (ISO),
updatedAt: string (ISO) }`, with `serializeNote`, following the existing
`*-dto.ts` files.

### Server

- `app/(app)/notes/queries.ts` — `getNotes()`: `verifySession()`, all notes.
- `app/(app)/notes/actions.ts` (`'use server'`, each calls `verifySession()`
  and `revalidatePath('/notes')`, returns the DTO where relevant):
  - `createNote(text)` — trims; rejects blank text.
  - `updateNote(id, text)` — saves text as given (the client decides deletion
    of blank notes, see below).
  - `setNotePinned(id, pinned)`.
  - `deleteNote(id)`.

### Pure helpers (`notes-views.ts`)

- `sortNotes(notes)` — pinned first, then `updatedAt` descending.
- `filterNotes(notes, query)` — case-insensitive substring match on text;
  blank query returns all.
- `relativeTime(iso, now)` — "just now", "5m ago", "3h ago", "2d ago", then a
  short date ("12 Sep") for anything older than 7 days, with the year added
  when it differs from the current year ("12 Sep 2025"). Lives in
  `app/lib/date-format.ts` (generic date formatting), not in `notes-views.ts`.

### UI

`page.tsx` loads notes and renders `<NotesBoard initialNotes={...} />`
(client), which owns the notes array and applies server results optimistically.

- `PageHeader` title "Notes" with the count in mono, and a search `Input`
  (sm, `search` icon, ~220px, full width on phones) filtering client-side.
- Compose card: borderless textarea "What's on your mind?" (3 rows, 17px), a
  "⌘ ↵" hint and a primary "Save" button. Save and ⌘/Ctrl+Enter both create
  the note and clear the box; blank input does nothing.
- Card grid `repeat(auto-fill, minmax(min(100%, 280px), 1fr))`: each card shows
  the text (pre-wrap, clamped to 8 lines), relative time, a pin `IconButton`
  (active state when pinned) and a delete `IconButton`. Pin/delete do not open
  the card.
- Empty state text: "No notes yet." or, with a query, "No matches."
- Clicking a card opens the note `Dialog` (title "Note", description
  "Edited 3h ago", width 560): a 10-row textarea, ghost "Delete" and primary
  "Done". Edits update local state immediately and are saved with a debounced
  `updateNote` (same pattern the Journal board used). Closing flushes any
  pending save; if the text is blank on close, the note is deleted instead.

## Phase 3 — Finance (`/finance`)

### Data

```prisma
enum EntryType {
  EXPENSE
  INCOME
}

model FinanceEntry {
  id        String    @id @default(cuid())
  type      EntryType
  /// Amount in centimes (1/100 DZD), always positive; `type` gives the sign.
  amount    Int
  category  String
  note      String    @default("")
  date      DateTime  @db.Date
  createdAt DateTime  @default(now())

  @@index([date])
  @@map("finance_entries")
}
```

DTO in `app/lib/finance-dto.ts`: `{ id, type: 'EXPENSE' | 'INCOME', amount
(centimes), category, note, date: 'YYYY-MM-DD' }`.

### Constants (`app/lib/finance.ts`)

- `EXPENSE_CATEGORIES`: Housing, Groceries, Dining, Transport, Bills,
  Shopping, Health, Fun, Other.
- `INCOME_CATEGORIES`: Salary, Freelance, Gifts, Refund, Other.
- `CATEGORY_COLOR`: the mockup's Still hues (Housing gray-500, Groceries
  moss-500, Dining amber-500, Transport mist-500, Bills sage-500, Shopping
  clay-500, Health moss-700, Fun amber-700, Other gray-400, Salary sage-500,
  Freelance mist-500, Gifts amber-500, Refund moss-500), falling back to
  gray-400.
- `formatMoney(centimes, { signed })` — `Intl.NumberFormat('fr-DZ',
  { style: 'currency', currency: 'DZD', minimumFractionDigits: 0,
  maximumFractionDigits: 2 })` on the absolute value, e.g. `12 345,5 DA`;
  `signed` prefixes "+" / "−" for non-zero values.
- `parseAmount(input)` — accepts "12", "12.5", "12,50"; returns centimes or
  `null` if not a number, ≤ 0, or more than 2 decimals.

### Server

- `app/(app)/finance/queries.ts` — `getFinanceEntries(fromMonth, toMonth)`:
  entries with `date` in `[first day of fromMonth, first day after toMonth)`,
  ordered by date desc, createdAt desc.
- `app/(app)/finance/actions.ts`:
  - `createFinanceEntry({ type, amount, category, note, date })` — validates
    amount is a positive integer, category belongs to the type's list, date is
    `YYYY-MM-DD`; trims note.
  - `deleteFinanceEntry(id)`.
  Both call `verifySession()` and `revalidatePath('/finance')`.

### Month selection

`page.tsx` reads `?month=YYYY-MM` from `searchParams` (defaults to the current
month; invalid values fall back to it; clamped to 1900-01..2100-12), loads
entries for that month and the five before it, and renders
`<FinanceBoard month=... entries=... />`. Check the Next 16 docs in
`node_modules/next/dist/docs/` for the current `searchParams` API before
writing it (per AGENTS.md). The ‹ › arrows and chart clicks navigate with
`router.push('/finance?month=…')`.

### Pure helpers (`finance-views.ts`)

- `monthTotals(entries, month)` → `{ earned, spent, net }` in centimes.
- `categoryBreakdown(entries, month)` → expense categories sorted by amount
  desc, each with amount, percent of month spend (rounded) and bar width
  relative to the largest (min 2%).
- `lastSixMonths(entries, month)` → six `{ month, label, earned, spent }`,
  oldest first, ending at `month`.
- `groupByDay(entries, month, todayKey)` → days desc, each with a label from
  the existing `calendarDateLabel` (Today, Yesterday, else "Tue, Sep 22"),
  signed day total, and its entries.

### UI

`FinanceBoard` (client):

- Header: "Finance" and a month switcher — chevron-left, "September 2026"
  (min-width 132px, centered), chevron-right.
- Totals strip between hairlines, three columns: Earned, Spent, Net (mono,
  24px). Net uses `--danger-fg` when negative.
- Entry form: `PillToggle` Expense/Income; then a grid `120px 150px 1fr 150px
  34px` — amount input (placeholder "0.00"), category `Select`, note input
  ("What for?"), date input (defaults to today), primary + `IconButton`. On
  phones the grid becomes two columns with the note spanning both. Switching
  type resets category to Groceries (expense) or Salary (income). Submitting an
  invalid amount does nothing (input keeps focus). On success the amount and
  note clear, and if the entry's month differs from the viewed month the board
  navigates to it.
- Two columns (stacked on phones):
  - "Spending by category": row with colour dot, name, percent, amount and a
    4px bar in the category colour. Empty: "No spending logged."
  - "Last 6 months": legend (Earned = accent, Spent = border-strong) and six
    paired CSS bars scaled to the largest value (max 132px, min 2px); the
    viewed month is full opacity with a bold label, others 55%. Clicking a
    month selects it; each has a `title` with its totals.
- "Entries" with the month count, grouped by day (label + signed total), each
  row: dot, category, muted note, signed amount (income in `--success-fg`),
  remove `IconButton` (x). Empty: "Nothing logged this month."
- Entries are not editable; remove and re-add.

## Shared

- Icons: add `sticky-note`, `wallet`, `search`, `pin` (Lucide paths,
  1.75 stroke, like the existing set).
- Nav items: `{ key: 'notes', label: 'Notes', href: '/notes', icon: 'sticky-note' }`,
  `{ key: 'finance', label: 'Finance', href: '/finance', icon: 'wallet' }`.
- Bottom nav keeps all 7 items at phone width; labels may shrink if they
  overflow at 360px.
- Existing primitives are reused: `Input`, `Select`, `Dialog`, `Button`,
  `IconButton`, `PillToggle`, `PageHeader`.

## Error handling

- Server actions throw on invalid input or missing session (as existing
  actions do). Boards apply optimistic updates where they can (pin, delete)
  and, if an action fails, roll back and show `window.alert(...)` — the same
  pattern the Tasks and Habits boards use.
- Notes autosave failure: keep the local text and show "Couldn't save" in
  the dialog description; the next edit or close retries.

## Testing

- Unit: `formatMoney`, `parseAmount`, all `finance-views` helpers,
  `sortNotes`, `filterNotes`, `relativeTime`.
- Integration (`*.integration.test.ts`, real DB like the existing ones):
  notes and finance queries and actions, including validation rejections and
  the month range query.
- Component (RTL): NotesBoard (compose, ⌘↵, search, pin, delete, dialog
  autosave, blank-on-close deletion), FinanceBoard (form, type switch, totals,
  breakdown, chart click, grouping, remove), nav items.

## Out of scope

Today/Dashboard widgets, editing finance entries, custom categories, budgets,
recurring entries, currency setting, note formatting/markdown, note tags.
