# Journal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Journal screen at `/journal` — one free-text entry per calendar date with a 5-option mood picker, prev/today/next day navigation, and a history list of past non-empty entries that jumps the editor to a clicked date.

**Architecture:** Journal is the 6th of 7 rollout phases (Foundation → Tasks → Matrix → Calendar → Habits → **Journal** → Dashboard), all previous phases already merged to `master`. Like every prior phase, one Server Component query fetches every journal entry once; the client owns all derived state (which date is being viewed, the history list shape) over that one array. There is exactly one Server Action, `saveJournalEntry`, which upserts by the unique `date` column — there is no separate create/update/delete distinction, matching the schema's own one-entry-per-date constraint. Text is autosaved on a debounce; mood changes save immediately; any pending save is flushed before navigating away or unmounting.

**Tech Stack:** Same as every prior phase — Next.js 16 App Router Server Components/Actions, Prisma 7 + Postgres, Vitest + React Testing Library.

## Global Constraints

- Single-user app — no `userId` anywhere, no auth beyond the existing session.
- Every server-side data access calls `verifySession()` from `@/app/lib/dal` as its first statement; `import 'server-only'` is the first import in `queries.ts`; `'use server'` is the first line of `actions.ts`. Matches every prior phase.
- **`revalidatePath('/journal', 'layout')` exactly once per Server Action.** There is only one Server Action in this phase (`saveJournalEntry`) — it still must call this exactly once, matching the convention fixed project-wide in the Calendar phase.
- **No `id` field anywhere in the journal data model.** Unlike `Task`/`Habit`, a journal entry's `date` (a unique column) is itself the natural key for every lookup, mutation, and React list key in this phase — do not thread the Prisma row's `id` through the DTO or any component prop; nothing needs it.
- **One entry per date, no delete.** `saveJournalEntry` always upserts keyed on `date` — there is no `createJournalEntry`/`updateJournalEntry`/`deleteJournalEntry` split, and no delete action exists at all. An entry that becomes empty text again is simply left as an empty-text row (the history list already filters those out via its own "non-empty text" rule) — do not add delete logic the design spec never asked for.
- **Never auto-create a row merely by navigating.** Browsing to a date with no existing entry renders an empty `{ date, text: '', mood: 'OKAY' }` editor state entirely client-side. `saveJournalEntry` is only ever called in response to an actual edit (a keystroke, or a mood-pill click) — never as a side effect of Prev/Next/Today navigation or clicking a history card. This avoids littering the database with empty rows for every date the user happens to pass through while browsing history.
- **Persistence timing: 600ms debounced autosave for text, immediate save for mood, always flushed before navigating away or unmounting.** One `scheduleSave(date, text, mood)` function is the single path both the debounced-text flow and the immediate-mood flow go through — "immediate" for mood is achieved by calling `scheduleSave` and then immediately calling `flushPendingSave()` right after, not by a second, separate save code path. `flushPendingSave()` is the single function used by every navigation handler (Prev/Next/Today/history-card-click) and by the component's unmount cleanup.
- **No revert-on-failure for a failed autosave.** Every prior phase's optimistic mutations revert local state and alert on failure. A live-typing textarea has nothing sensible to revert to — the user is still typing, and yanking their words back to some earlier snapshot would be actively harmful. This phase deliberately alerts on failure (`window.alert('Could not save your journal entry. Please try again.')`) without touching local state. This is a disclosed, deliberate exception to the established convention, not an oversight.
- **No master-detail JS toggle, unlike Habits.** `.pw-journal-grid` already exists in `app/styles/layout.css` (added during the Foundation phase's CSS-copy step, even though `/journal` has been a stub until now) and already collapses from a two-column grid to a single column at `≤1100px` via an existing media query — the history pane moves *below* the editor on narrow screens, it is never hidden. Do not add a `useMediaQuery`/`isNarrow` state for this phase; there is nothing to conditionally show or hide.
- **Sunday week start / `'en-US'` locale guardrails still apply project-wide**, though this phase should need zero new date-formatting code: `calendarDateLabel(key, todayKey)` from `@/app/lib/calendar-dates` already implements the mockup's exact `fmtDateLabel` (Today/Yesterday/Tomorrow special-cased, else `'en-US'`-safe weekday+month+day) — reuse it directly for the journal header's date label and every history card's date label. Do not add a new `toLocaleDateString` call anywhere in this phase.
- **`PillToggle<Mood>` uses the raw Prisma enum values directly** (`'GREAT' | 'GOOD' | 'OKAY' | 'LOW' | 'ROUGH'`) as both the pill's `value` and its options' `value` fields, with human-readable `label`s ("Great", "Good", "Okay", "Low", "Rough") — no lowercase string-mapping layer, matching the Habits phase's `PillToggle<FreqType>` precedent exactly.
- **Never display a raw uppercase Prisma enum string in the UI.** The history card's mood tag shows a friendly label (e.g. "Great"), via a `MOOD_LABELS: Record<Mood, string>` lookup — not `entry.mood` directly.
- **Preview truncation is exactly the mockup's logic:** `text.slice(0, 140) + (text.length > 140 ? '…' : '')`.
- **History list is unpaginated and unfiltered beyond "non-empty text and not the currently-navigated date"** — matches the mockup exactly; this is a personal single-user dataset, no pagination is needed.
- **Dashboard integration is explicitly out of scope for this phase.** Design spec §4.2 describes a "Today" dashboard widget with a mini journal textarea bound to today's date only — that is built during the Dashboard phase (last), which aggregates over Tasks/Habits/Journal once all three exist. Do not touch `app/(app)/dashboard/`.
- No placeholders, no TODOs — every task ships working, tested code.

---

## Task 1: Journal DTO + read query

**Files:**
- Create: `app/lib/journal-dto.ts`
- Create: `app/(app)/journal/queries.ts`
- Create: `app/(app)/journal/queries.integration.test.ts`

**Interfaces:**
- Produces: `JournalEntryDTO { date: string; text: string; mood: Mood }`, `serializeJournalEntry(entry): JournalEntryDTO` (both from `app/lib/journal-dto.ts`), `getJournalEntries(): Promise<JournalEntryDTO[]>` (from `app/(app)/journal/queries.ts`, re-exports `JournalEntryDTO`).
- Consumes: `toDateKey` from `@/app/lib/task-dto` (already exported, reused as-is — this is its 3rd reuse site after Calendar and Habits), `prisma` from `@/app/lib/prisma`, `verifySession` from `@/app/lib/dal`, `Mood` from `@prisma/client`.
- Consumed by (later tasks): every component and Server Action in this plan imports `JournalEntryDTO` from `./queries`.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/journal/queries.integration.test.ts`:
```ts
/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll } from 'vitest';

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

import { vi } from 'vitest';
import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { getJournalEntries } from './queries';

describe('getJournalEntries', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.journalEntry.deleteMany({ where: { date: { in: [new Date('2026-01-15'), new Date('2026-01-20')] } } });
  });

  test('returns entries ordered by date descending, serialized to date-key strings', async () => {
    await prisma.journalEntry.create({ data: { date: new Date('2026-01-15'), text: 'Earlier', mood: 'OKAY' } });
    await prisma.journalEntry.create({ data: { date: new Date('2026-01-20'), text: 'Later', mood: 'GOOD' } });

    const result = await getJournalEntries();
    const testEntries = result.filter((e) => e.date === '2026-01-15' || e.date === '2026-01-20');
    expect(testEntries).toEqual([
      { date: '2026-01-20', text: 'Later', mood: 'GOOD' },
      { date: '2026-01-15', text: 'Earlier', mood: 'OKAY' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — `./queries` doesn't exist yet.

- [ ] **Step 3: Write the DTO helper**

Create `app/lib/journal-dto.ts`:
```ts
import type { Mood } from '@prisma/client';
import { toDateKey } from './task-dto';

export interface JournalEntryDTO {
  date: string;
  text: string;
  mood: Mood;
}

export function serializeJournalEntry(entry: { date: Date; text: string; mood: Mood }): JournalEntryDTO {
  return {
    date: toDateKey(entry.date)!,
    text: entry.text,
    mood: entry.mood,
  };
}
```

- [ ] **Step 4: Write the query**

Create `app/(app)/journal/queries.ts`:
```ts
import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeJournalEntry, type JournalEntryDTO } from '@/app/lib/journal-dto';

export type { JournalEntryDTO };

export async function getJournalEntries(): Promise<JournalEntryDTO[]> {
  await verifySession();
  const entries = await prisma.journalEntry.findMany({
    orderBy: { date: 'desc' },
  });
  return entries.map(serializeJournalEntry);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:integration`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/lib/journal-dto.ts "app/(app)/journal/queries.ts" "app/(app)/journal/queries.integration.test.ts"
git commit -m "feat: add Journal entry DTO and getJournalEntries query"
```

---

## Task 2: Server action — upsert by date

**Files:**
- Create: `app/(app)/journal/actions.ts`
- Create: `app/(app)/journal/actions.integration.test.ts`

**Interfaces:**
- Produces: `SaveJournalEntryInput { date: string; text: string; mood: Mood }`, `saveJournalEntry(input): Promise<JournalEntryDTO>`.
- Consumes: `JournalEntryDTO`/`serializeJournalEntry` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/journal/actions.integration.test.ts`:
```ts
/**
 * @vitest-environment node
 */
import { describe, test, expect, afterEach, beforeAll, vi } from 'vitest';

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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { revalidatePath } from 'next/cache';
import { saveJournalEntry } from './actions';

describe('saveJournalEntry', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.journalEntry.deleteMany({ where: { date: new Date('2026-02-10') } });
    vi.mocked(revalidatePath).mockClear();
  });

  test('creates a new entry when none exists for that date', async () => {
    const entry = await saveJournalEntry({ date: '2026-02-10', text: 'First entry', mood: 'GREAT' });
    expect(entry).toEqual({ date: '2026-02-10', text: 'First entry', mood: 'GREAT' });
    const rows = await prisma.journalEntry.findMany({ where: { date: new Date('2026-02-10') } });
    expect(rows).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith('/journal', 'layout');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  test('updates the existing entry for that date instead of creating a duplicate', async () => {
    await saveJournalEntry({ date: '2026-02-10', text: 'First entry', mood: 'GREAT' });
    vi.mocked(revalidatePath).mockClear();

    const updated = await saveJournalEntry({ date: '2026-02-10', text: 'Edited entry', mood: 'LOW' });
    expect(updated).toEqual({ date: '2026-02-10', text: 'Edited entry', mood: 'LOW' });

    const rows = await prisma.journalEntry.findMany({ where: { date: new Date('2026-02-10') } });
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe('Edited entry');
    expect(rows[0].mood).toBe('LOW');
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — `./actions` doesn't exist yet.

- [ ] **Step 3: Implement the action**

Create `app/(app)/journal/actions.ts`:
```ts
'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import type { Mood } from '@prisma/client';
import { serializeJournalEntry, type JournalEntryDTO } from '@/app/lib/journal-dto';

export interface SaveJournalEntryInput {
  date: string;
  text: string;
  mood: Mood;
}

export async function saveJournalEntry(input: SaveJournalEntryInput): Promise<JournalEntryDTO> {
  await verifySession();
  const dateValue = new Date(input.date);
  const entry = await prisma.journalEntry.upsert({
    where: { date: dateValue },
    create: { date: dateValue, text: input.text, mood: input.mood },
    update: { text: input.text, mood: input.mood },
  });
  revalidatePath('/journal', 'layout');
  return serializeJournalEntry(entry);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:integration`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/journal/actions.ts" "app/(app)/journal/actions.integration.test.ts"
git commit -m "feat: add saveJournalEntry upsert-by-date server action"
```

---

## Task 3: Pure view helpers — preview truncation, mood labels, history shaping

**Files:**
- Create: `app/(app)/journal/journal-views.ts`
- Create: `app/(app)/journal/journal-views.test.ts`

**Interfaces:**
- Produces: `truncatePreview(text: string, max?: number): string`; `MOOD_LABELS: Record<Mood, string>`; `JournalHistoryItem { date: string; dateLabel: string; moodLabel: string; preview: string }`, `buildJournalHistory(entries: JournalEntryDTO[], currentDate: string, todayKey: string): JournalHistoryItem[]`.
- Consumes: `calendarDateLabel` from `@/app/lib/calendar-dates`, `JournalEntryDTO` from `@/app/lib/journal-dto`.
- Consumed by (later tasks): `journal-board.tsx` (calls `buildJournalHistory`), `journal-history.tsx` (receives its output as props, does not call it itself).

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/journal/journal-views.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { truncatePreview, MOOD_LABELS, buildJournalHistory } from './journal-views';
import type { JournalEntryDTO } from '@/app/lib/journal-dto';

describe('truncatePreview', () => {
  test('returns the text unchanged when at or under the limit', () => {
    expect(truncatePreview('short text', 140)).toBe('short text');
    expect(truncatePreview('a'.repeat(140), 140)).toBe('a'.repeat(140));
  });

  test('truncates and appends an ellipsis when over the limit', () => {
    const long = 'a'.repeat(141);
    expect(truncatePreview(long, 140)).toBe('a'.repeat(140) + '…');
  });

  test('defaults to a 140-character limit', () => {
    const long = 'b'.repeat(150);
    expect(truncatePreview(long)).toBe('b'.repeat(140) + '…');
  });
});

describe('MOOD_LABELS', () => {
  test('has a friendly label for every mood', () => {
    expect(MOOD_LABELS).toEqual({ GREAT: 'Great', GOOD: 'Good', OKAY: 'Okay', LOW: 'Low', ROUGH: 'Rough' });
  });
});

describe('buildJournalHistory', () => {
  const entries: JournalEntryDTO[] = [
    { date: '2026-09-20', text: 'Older entry', mood: 'OKAY' },
    { date: '2026-09-22', text: 'Newer entry', mood: 'GOOD' },
    { date: '2026-09-23', text: 'Today, should be excluded', mood: 'GREAT' },
    { date: '2026-09-19', text: '', mood: 'LOW' },
  ];

  test('excludes the current date and empty-text entries, sorts newest first', () => {
    const result = buildJournalHistory(entries, '2026-09-23', '2026-09-23');
    expect(result.map((r) => r.date)).toEqual(['2026-09-22', '2026-09-20']);
  });

  test('formats each item with a date label, mood label, and preview', () => {
    const result = buildJournalHistory(entries, '2026-09-23', '2026-09-23');
    expect(result[0]).toEqual({
      date: '2026-09-22',
      dateLabel: 'Yesterday',
      moodLabel: 'Good',
      preview: 'Newer entry',
    });
  });

  test('is unaffected by which date is "current" when checking a non-adjacent date', () => {
    const result = buildJournalHistory(
      [{ date: '2026-09-22', text: 'x', mood: 'OKAY' }],
      '2026-09-10',
      '2026-09-23'
    );
    expect(result[0].dateLabel).toBe('Yesterday');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- journal-views`
Expected: FAIL — `./journal-views` doesn't exist yet.

- [ ] **Step 3: Implement the helpers**

Create `app/(app)/journal/journal-views.ts`:
```ts
import type { Mood } from '@prisma/client';
import { calendarDateLabel } from '@/app/lib/calendar-dates';
import type { JournalEntryDTO } from '@/app/lib/journal-dto';

export function truncatePreview(text: string, max = 140): string {
  return text.slice(0, max) + (text.length > max ? '…' : '');
}

export const MOOD_LABELS: Record<Mood, string> = {
  GREAT: 'Great',
  GOOD: 'Good',
  OKAY: 'Okay',
  LOW: 'Low',
  ROUGH: 'Rough',
};

export interface JournalHistoryItem {
  date: string;
  dateLabel: string;
  moodLabel: string;
  preview: string;
}

export function buildJournalHistory(
  entries: JournalEntryDTO[],
  currentDate: string,
  todayKey: string
): JournalHistoryItem[] {
  return entries
    .filter((e) => e.date !== currentDate && e.text.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({
      date: e.date,
      dateLabel: calendarDateLabel(e.date, todayKey),
      moodLabel: MOOD_LABELS[e.mood],
      preview: truncatePreview(e.text),
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- journal-views`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/journal/journal-views.ts" "app/(app)/journal/journal-views.test.ts"
git commit -m "feat: add journal preview/mood-label/history-shaping pure functions"
```

---

## Task 4: Journal header

**Files:**
- Create: `app/(app)/journal/journal-header.tsx`
- Create: `app/(app)/journal/journal-header.test.tsx`

**Interfaces:**
- Produces: `JournalHeader({ dateLabel, onPrev, onToday, onNext }: JournalHeaderProps)`.
- Consumes: `Button`, `IconButton` (`@/app/components/ui/*`), `Icon` (`@/app/components/icons`, `'left'`/`'right'` icon names).
- Consumed by (Task 7): `journal-board.tsx`.

This mirrors `app/(app)/calendar/calendar-header.tsx`'s exact structure (date label on the left, Prev/Today/Next controls on the right) minus its "New task" button — Journal has no create action. Unlike `CalendarHeader`, this component does not own the page's outer `max-width`/padding wrapper — that lives in Task 7's orchestrator, matching the mockup's own nesting (the mockup wraps the whole Journal view, header included, in one `max-width:1440px` container — read lines 465-477 of the mockup file directly if you want to confirm this nesting before writing the component).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/journal/journal-header.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { JournalHeader } from './journal-header';

describe('JournalHeader', () => {
  test('renders the date label and calls each handler', () => {
    const onPrev = vi.fn();
    const onToday = vi.fn();
    const onNext = vi.fn();
    render(<JournalHeader dateLabel="Wed, Sep 23" onPrev={onPrev} onToday={onToday} onNext={onNext} />);
    expect(screen.getByText('Wed, Sep 23')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Previous day'));
    expect(onPrev).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onToday).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Next day'));
    expect(onNext).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- journal-header`
Expected: FAIL — `./journal-header` doesn't exist yet.

- [ ] **Step 3: Implement the header**

Create `app/(app)/journal/journal-header.tsx`:
```tsx
'use client';

import { Button } from '@/app/components/ui/button';
import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';

export interface JournalHeaderProps {
  dateLabel: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}

export function JournalHeader({ dateLabel, onPrev, onToday, onNext }: JournalHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--weight-semibold)',
          letterSpacing: 'var(--tracking-tight)',
          fontSize: 'var(--text-lg)',
        }}
      >
        {dateLabel}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconButton variant="outline" onClick={onPrev} label="Previous day">
          <Icon name="left" size={16} />
        </IconButton>
        <Button variant="secondary" onClick={onToday}>
          Today
        </Button>
        <IconButton variant="outline" onClick={onNext} label="Next day">
          <Icon name="right" size={16} />
        </IconButton>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- journal-header`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/journal/journal-header.tsx" "app/(app)/journal/journal-header.test.tsx"
git commit -m "feat: add JournalHeader with prev/today/next day navigation"
```

---

## Task 5: Journal editor

**Files:**
- Create: `app/(app)/journal/journal-editor.tsx`
- Create: `app/(app)/journal/journal-editor.test.tsx`

**Interfaces:**
- Produces: `JournalEditor({ mood, text, onMoodChange, onTextChange }: JournalEditorProps)`.
- Consumes: `PillToggle` (`@/app/components/ui/pill-toggle`), `Mood` (`@prisma/client`).
- Consumed by (Task 7): `journal-board.tsx`.

Fully controlled, no internal state and no debounce logic in this component — every keystroke and every mood click calls straight back up to the caller via props. The debounce/immediate-save timing lives entirely in Task 7's orchestrator.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/journal/journal-editor.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { JournalEditor } from './journal-editor';

describe('JournalEditor', () => {
  test('renders the current mood as selected and the current text', () => {
    render(<JournalEditor mood="GOOD" text="Feeling okay" onMoodChange={vi.fn()} onTextChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Good' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByPlaceholderText('Write about your day…')).toHaveValue('Feeling okay');
  });

  test('calls onMoodChange with the raw enum value when a different mood pill is clicked', () => {
    const onMoodChange = vi.fn();
    render(<JournalEditor mood="OKAY" text="" onMoodChange={onMoodChange} onTextChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Rough' }));
    expect(onMoodChange).toHaveBeenCalledWith('ROUGH');
  });

  test('calls onTextChange as the user types', () => {
    const onTextChange = vi.fn();
    render(<JournalEditor mood="OKAY" text="" onMoodChange={vi.fn()} onTextChange={onTextChange} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'New text' } });
    expect(onTextChange).toHaveBeenCalledWith('New text');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- journal-editor`
Expected: FAIL — `./journal-editor` doesn't exist yet.

- [ ] **Step 3: Implement the editor**

Create `app/(app)/journal/journal-editor.tsx`:
```tsx
'use client';

import type { Mood } from '@prisma/client';
import { PillToggle } from '@/app/components/ui/pill-toggle';

export interface JournalEditorProps {
  mood: Mood;
  text: string;
  onMoodChange: (mood: Mood) => void;
  onTextChange: (text: string) => void;
}

const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'GREAT', label: 'Great' },
  { value: 'GOOD', label: 'Good' },
  { value: 'OKAY', label: 'Okay' },
  { value: 'LOW', label: 'Low' },
  { value: 'ROUGH', label: 'Rough' },
];

export function JournalEditor({ mood, text, onMoodChange, onTextChange }: JournalEditorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <PillToggle ariaLabel="Mood" value={mood} onChange={onMoodChange} options={MOOD_OPTIONS} />
      <textarea
        rows={14}
        placeholder="Write about your day…"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-strong)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-relaxed)',
          outline: 'none',
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- journal-editor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/journal/journal-editor.tsx" "app/(app)/journal/journal-editor.test.tsx"
git commit -m "feat: add JournalEditor mood picker and textarea"
```

---

## Task 6: Journal history

**Files:**
- Create: `app/(app)/journal/journal-history.tsx`
- Create: `app/(app)/journal/journal-history.test.tsx`

**Interfaces:**
- Produces: `JournalHistory({ items, onOpen }: JournalHistoryProps)`.
- Consumes: `JournalHistoryItem` (Task 3, `./journal-views`).
- Consumed by (Task 7): `journal-board.tsx`, which calls `buildJournalHistory` itself and passes the resulting array down — this component never calls `buildJournalHistory`, matching `AgendaView`'s precedent from the Calendar phase (a dumb renderer of already-shaped data).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/journal/journal-history.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { JournalHistory } from './journal-history';
import type { JournalHistoryItem } from './journal-views';

const items: JournalHistoryItem[] = [
  { date: '2026-09-22', dateLabel: 'Yesterday', moodLabel: 'Good', preview: 'Newer entry' },
  { date: '2026-09-20', dateLabel: 'Sun, Sep 20', moodLabel: 'Okay', preview: 'Older entry' },
];

describe('JournalHistory', () => {
  test('renders one card per item', () => {
    render(<JournalHistory items={items} onOpen={vi.fn()} />);
    expect(screen.getByText('Newer entry')).toBeInTheDocument();
    expect(screen.getByText('Older entry')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  test('shows the empty state when there are no items', () => {
    render(<JournalHistory items={[]} onOpen={vi.fn()} />);
    expect(screen.getByText('Past entries will show up here.')).toBeInTheDocument();
  });

  test('clicking a card calls onOpen with its date', () => {
    const onOpen = vi.fn();
    render(<JournalHistory items={items} onOpen={onOpen} />);
    fireEvent.click(screen.getByText('Newer entry'));
    expect(onOpen).toHaveBeenCalledWith('2026-09-22');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- journal-history`
Expected: FAIL — `./journal-history` doesn't exist yet.

- [ ] **Step 3: Implement the history list**

Create `app/(app)/journal/journal-history.tsx`:
```tsx
'use client';

import type { JournalHistoryItem } from './journal-views';

export interface JournalHistoryProps {
  items: JournalHistoryItem[];
  onOpen: (date: string) => void;
}

export function JournalHistory({ items, onOpen }: JournalHistoryProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <h4
        style={{
          margin: '0 0 var(--space-1)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase',
          fontWeight: 'var(--weight-medium)',
        }}
      >
        Past entries
      </h4>
      {items.map((item) => (
        <div
          key={item.date}
          onClick={() => onOpen(item.date)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 'var(--space-4)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>
              {item.dateLabel}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-2xs)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {item.moodLabel}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-normal)' }}>
            {item.preview}
          </p>
        </div>
      ))}
      {items.length === 0 && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Past entries will show up here.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- journal-history`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/journal/journal-history.tsx" "app/(app)/journal/journal-history.test.tsx"
git commit -m "feat: add JournalHistory list with empty state"
```

---

## Task 7: Journal board orchestrator

**Files:**
- Create: `app/(app)/journal/journal-board.tsx`
- Create: `app/(app)/journal/journal-board.test.tsx`

**Interfaces:**
- Produces: `JournalBoard({ initialEntries }: JournalBoardProps)`.
- Consumes: `JournalHeader` (Task 4), `JournalEditor` (Task 5), `JournalHistory` (Task 6), `buildJournalHistory` (Task 3), `saveJournalEntry` (Task 2), `todayKey` (`@/app/lib/date-format`), `addDays`/`calendarDateLabel` (`@/app/lib/calendar-dates`).
- Consumed by (Task 8): `app/(app)/journal/page.tsx`.

This is the only task in the phase with real state-management judgment: the debounce/flush design from the Global Constraints section is implemented here, and here alone.

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/journal/journal-board.test.tsx`:
```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { JournalBoard } from './journal-board';
import type { JournalEntryDTO } from './queries';
import * as actions from './actions';

vi.mock('./actions', () => ({
  saveJournalEntry: vi.fn(),
}));

function makeEntry(overrides: Partial<JournalEntryDTO> = {}): JournalEntryDTO {
  return { date: '2026-09-23', text: '', mood: 'OKAY', ...overrides };
}

describe('JournalBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(actions.saveJournalEntry).mockResolvedValue(makeEntry());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T12:00:00'));
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('typing debounces the save until 600ms of inactivity', () => {
    render(<JournalBoard initialEntries={[]} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'Hello' } });
    expect(actions.saveJournalEntry).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(actions.saveJournalEntry).toHaveBeenCalledWith({ date: '2026-09-23', text: 'Hello', mood: 'OKAY' });
  });

  test('a mood click saves immediately, without waiting for the debounce timer', () => {
    render(<JournalBoard initialEntries={[]} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Great' }));
    expect(actions.saveJournalEntry).toHaveBeenCalledWith({ date: '2026-09-23', text: '', mood: 'GREAT' });
  });

  test('clicking Next flushes a pending debounced save to the date being left, before navigating', () => {
    render(<JournalBoard initialEntries={[]} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'abc' } });
    expect(actions.saveJournalEntry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Next day'));
    expect(actions.saveJournalEntry).toHaveBeenCalledWith({ date: '2026-09-23', text: 'abc', mood: 'OKAY' });
    expect(screen.getByPlaceholderText('Write about your day…')).toHaveValue('');
  });

  test('unmounting flushes a pending debounced save', () => {
    const { unmount } = render(<JournalBoard initialEntries={[]} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'unsaved' } });
    expect(actions.saveJournalEntry).not.toHaveBeenCalled();
    unmount();
    expect(actions.saveJournalEntry).toHaveBeenCalledWith({ date: '2026-09-23', text: 'unsaved', mood: 'OKAY' });
  });

  test('shows an alert if a save fails, without reverting the typed text', async () => {
    vi.mocked(actions.saveJournalEntry).mockRejectedValue(new Error('boom'));
    render(<JournalBoard initialEntries={[]} />);
    fireEvent.change(screen.getByPlaceholderText('Write about your day…'), { target: { value: 'risky' } });
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });
    expect(window.alert).toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Write about your day…')).toHaveValue('risky');
  });

  test('clicking a history-card entry navigates the editor to that date', () => {
    const older = makeEntry({ date: '2026-09-20', text: 'Older entry text', mood: 'GOOD' });
    render(<JournalBoard initialEntries={[older]} />);
    fireEvent.click(screen.getByText('Older entry text'));
    expect(screen.getByPlaceholderText('Write about your day…')).toHaveValue('Older entry text');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- journal-board`
Expected: FAIL — `./journal-board` doesn't exist yet.

- [ ] **Step 3: Implement the orchestrator**

Create `app/(app)/journal/journal-board.tsx`:
```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Mood } from '@prisma/client';
import { JournalHeader } from './journal-header';
import { JournalEditor } from './journal-editor';
import { JournalHistory } from './journal-history';
import { buildJournalHistory } from './journal-views';
import { saveJournalEntry } from './actions';
import { todayKey as getTodayKey } from '@/app/lib/date-format';
import { addDays, calendarDateLabel } from '@/app/lib/calendar-dates';
import type { JournalEntryDTO } from './queries';

const SAVE_DEBOUNCE_MS = 600;

export interface JournalBoardProps {
  initialEntries: JournalEntryDTO[];
}

export function JournalBoard({ initialEntries }: JournalBoardProps) {
  const [entries, setEntries] = useState<Record<string, JournalEntryDTO>>(() =>
    Object.fromEntries(initialEntries.map((e) => [e.date, e]))
  );
  const [journalDate, setJournalDate] = useState(() => getTodayKey());

  const pendingSaveRef = useRef<{ date: string; text: string; mood: Mood } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    saveJournalEntry(pending).catch(() => {
      window.alert('Could not save your journal entry. Please try again.');
    });
  }, []);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  function scheduleSave(date: string, text: string, mood: Mood) {
    pendingSaveRef.current = { date, text, mood };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushPendingSave();
    }, SAVE_DEBOUNCE_MS);
  }

  const todayKey = getTodayKey();
  const currentEntry: JournalEntryDTO = entries[journalDate] ?? { date: journalDate, text: '', mood: 'OKAY' };
  const historyItems = buildJournalHistory(Object.values(entries), journalDate, todayKey);

  function handleTextChange(text: string) {
    setEntries((prev) => ({ ...prev, [journalDate]: { ...currentEntry, text } }));
    scheduleSave(journalDate, text, currentEntry.mood);
  }

  function handleMoodChange(mood: Mood) {
    setEntries((prev) => ({ ...prev, [journalDate]: { ...currentEntry, mood } }));
    scheduleSave(journalDate, currentEntry.text, mood);
    flushPendingSave();
  }

  function navigateTo(date: string) {
    flushPendingSave();
    setJournalDate(date);
  }

  function handlePrev() {
    navigateTo(addDays(journalDate, -1));
  }

  function handleNext() {
    navigateTo(addDays(journalDate, 1));
  }

  function handleToday() {
    navigateTo(todayKey);
  }

  return (
    <div style={{ maxWidth: 1440, padding: '0 clamp(16px, 3vw, 32px)' }}>
      <JournalHeader
        dateLabel={calendarDateLabel(journalDate, todayKey)}
        onPrev={handlePrev}
        onToday={handleToday}
        onNext={handleNext}
      />
      <div className="pw-journal-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 'var(--space-6)' }}>
        <JournalEditor
          mood={currentEntry.mood}
          text={currentEntry.text}
          onMoodChange={handleMoodChange}
          onTextChange={handleTextChange}
        />
        <JournalHistory items={historyItems} onOpen={navigateTo} />
      </div>
    </div>
  );
}
```

Note on `flushPendingSave`'s `useCallback([])`: its body only reads/writes two `useRef` objects (whose identity is stable across renders by definition) and calls the imported, module-level `saveJournalEntry` — it never closes over any prop, state, or other per-render value, so an empty dependency array is correct, not a lint workaround. This is what lets the unmount `useEffect` list `flushPendingSave` in its own dependency array (satisfying `react-hooks/exhaustive-deps` for real, not via a suppression comment) without the effect re-subscribing on every render — the callback's reference never changes, so the effect's cleanup still only fires once, on unmount.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- journal-board`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/journal/journal-board.tsx" "app/(app)/journal/journal-board.test.tsx"
git commit -m "feat: add JournalBoard orchestrator with debounced autosave"
```

---

## Task 8: Wire into /journal + cleanup

**Files:**
- Modify: `app/(app)/journal/page.tsx`
- Modify: `app/(app)/stub-pages.test.tsx`

**Interfaces:**
- No new exports — `JournalPage` becomes an async Server Component with no props, matching every prior phase's final-task shape.

- [ ] **Step 1: Replace the stub page**

Replace `app/(app)/journal/page.tsx`:
```tsx
import { getJournalEntries } from './queries';
import { JournalBoard } from './journal-board';

export default async function JournalPage() {
  const entries = await getJournalEntries();
  return <JournalBoard initialEntries={entries} />;
}
```

- [ ] **Step 2: Update the stub-pages test**

Replace `app/(app)/stub-pages.test.tsx` in full — Journal is the last screen besides Dashboard to leave this table, so only `DashboardPage` remains afterward:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';

// Tasks, Matrix, Calendar, Habits, and Journal are no longer stub pages (see
// ./tasks/tasks-board.test.tsx, ./matrix/matrix-board.test.tsx,
// ./calendar/calendar-board.test.tsx, ./habits/habits-board.test.tsx, and
// ./journal/journal-board.test.tsx) so all five are intentionally excluded
// from this table-driven stub-page test. Dashboard is built last, per the
// rollout plan, and is the only page remaining here.
const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
];

describe('stub route pages', () => {
  test.each(pages)('$heading page renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Full verification suite**

Run, in order, and confirm each passes cleanly before proceeding to the next:
```bash
npm test
npm run test:integration
npx tsc --noEmit
npx eslint "app/(app)/journal" app/lib
npm run build
```
Expected: all green; the build's route table shows `/journal` as a dynamic (`ƒ`) route.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/journal/page.tsx" "app/(app)/stub-pages.test.tsx"
git commit -m "feat: wire the Journal board into /journal"
```

- [ ] **Step 5: Manual walkthrough (controller, not this implementer)**

Same as every prior phase's final task: a live authenticated walkthrough against a real dev server and real Postgres (login, load `/journal`, type in the editor and confirm the debounced save persists after 600ms, click a mood pill and confirm it saves immediately, navigate Prev/Next/Today and confirm a pending edit is flushed to the correct date, click a history card and confirm the editor jumps there, reload and confirm persistence) is out of scope for this implementer subagent — the controller performs it after this task is reported done, using real dev credentials, exactly as documented in every prior phase's final task.

---

## Self-review notes

**1. Spec coverage against design spec §4.6.** Walking through the spec's prose sentence by sentence: "One entry per calendar date (no multiple entries/day, no title field)" → the schema's unique `date` column plus `saveJournalEntry`'s upsert-by-date (Task 2) enforce this structurally; there is no title field anywhere in `JournalEntryDTO` (Task 1) or the editor (Task 5). "Header: date label + prev/today/next day nav" → Task 4. "Left: mood picker (5 pills — Great/Good/Okay/Low/Rough) + textarea, bound to whatever date is currently navigated to" → Task 5's `JournalEditor`, driven by Task 7's `currentEntry` (always derived from the live `journalDate`, never a stale snapshot). "Right (below on mobile, ≤1100px): past entries with non-empty text, newest first, each a card with date, mood tag, and a ~140-char preview; click to jump the editor to that date" → Task 3's `buildJournalHistory` (non-empty-text filter, newest-first sort, `truncatePreview`) + Task 6's `JournalHistory` (renders the shape, `onOpen` jumps the editor) + Task 7's `navigateTo` (the actual jump, with a flush first). "Empty: 'Past entries will show up here.'" → Task 6, asserted verbatim in its test. Every sentence of §4.6 maps to a task; no gap found.

**2. Placeholder scan.** No "TBD"/"TODO"/"implement later" anywhere in the 8 tasks. Every step has complete, literal code.

**3. Type-consistency check.** `JournalEntryDTO` (Task 1, re-exported unchanged from `./queries`) is the one shape every other task imports — Tasks 3, 7 (via `entries: JournalEntryDTO[]`/`Object.values(entries)`), and the DTO's `date: string; text: string; mood: Mood` fields are never redefined or reshaped elsewhere. `Mood` (Prisma enum, `'GREAT'|'GOOD'|'OKAY'|'LOW'|'ROUGH'`) flows unchanged from the schema through `JournalEntryDTO.mood`, `SaveJournalEntryInput.mood` (Task 2), `JournalEditorProps.mood`/`onMoodChange` (Task 5), and `PillToggle<Mood>`'s generic instantiation (Task 5) — no lowercase-string remapping layer anywhere, matching the Habits phase's `FreqType` precedent exactly. `JournalHistoryItem` (Task 3) is consumed unchanged by `JournalHistory` (Task 6) and produced unchanged by `journal-board.tsx` (Task 7) — field names (`date`, `dateLabel`, `moodLabel`, `preview`) match exactly at both ends. `JournalHeaderProps`' four fields (Task 4) are supplied unchanged by Task 7's four corresponding values/handlers.

**4. Hand-traced verification of the debounce/flush design's correctness (the one piece of real state-management judgment in this plan).** Scenario: the user is viewing date D1, types "a", then "b", then "c" (three keystrokes, each re-scheduling the same 600ms timer so it never actually fires), then clicks "Next" before any of that 600ms elapses.
- Keystroke 1 ("a"): `handleTextChange('a')` → local `entries[D1].text` becomes `'a'` → `scheduleSave(D1, 'a', mood)` sets `pendingSaveRef.current = { date: D1, text: 'a', mood }` and starts timer T1.
- Keystroke 2 ("ab"): same, but `scheduleSave(D1, 'ab', mood)` clears T1, sets `pendingSaveRef.current = { date: D1, text: 'ab', mood }`, starts timer T2.
- Keystroke 3 ("abc"): same again — `pendingSaveRef.current = { date: D1, text: 'abc', mood }`, timer T3 running.
- Click "Next" (before T3's 600ms elapses): `handleNext()` → `navigateTo(D2)` → `flushPendingSave()` runs **first**: clears T3, reads `pendingSaveRef.current` (still `{ date: D1, text: 'abc', mood }` — this object was captured at *schedule* time, not read fresh from current component state at *flush* time, so it is unaffected by `journalDate` having not yet changed), nulls the ref, and calls `saveJournalEntry({ date: D1, text: 'abc', mood })`. Only **then** does `navigateTo` call `setJournalDate(D2)`.
- Result: the correct final text (`'abc'`) is saved to the **old** date (D1), never the new one, and no double-save occurs (T3 is cleared before it could ever fire). This is the exact property the design constraint set out to guarantee, and it holds because `pendingSaveRef` stores the target `date` as data captured at schedule-time inside the ref itself, rather than the flush logic re-deriving "which date is this for" from whatever `journalDate` happens to be when it runs.
- A second, shorter trace for the mood-immediately-saves path: clicking a mood pill calls `scheduleSave` (which sets the ref and starts a fresh timer) immediately followed by `flushPendingSave()` (which clears that just-started timer and saves right away) — so the timer is never left dangling from a mood click, and a rapid mood-click-then-Next sequence flushes nothing a second time (the mood click's own flush already cleared and nulled the ref before any navigation handler could run).

**5. A deliberate exception to an established convention, stated once here rather than repeated in every task:** unlike every prior phase's optimistic mutations (which revert local state and alert on failure), a failed autosave in this phase only alerts — it does not revert the user's typed text. Reverting live-typed content out from under a user mid-sentence would be actively harmful, not a safety net; the existing convention exists to undo an *action* (a toggle, a drag, a delete) cleanly, not to undo *ongoing input*. This was decided during plan-writing, not discovered as a implementation-time surprise.

**6. Reuse discipline confirmed.** `calendarDateLabel` (Calendar phase) is reused for both the header's date label and every history card's date label — this phase adds zero new date-formatting logic. `toDateKey` (Tasks phase) is reused for the DTO's serialization — its 3rd reuse site. `PillToggle` (Foundation phase) is reused for the mood picker, exactly as the Habits phase reused it for frequency — no new pill-button implementation. No new CSS was needed; `.pw-journal-grid` already existed and already had its responsive breakpoint wired from the Foundation phase's CSS-copy step.
