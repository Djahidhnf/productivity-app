# Notes, Finance and Journal Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Journal feature (code and table), and add the Notes and Finance screens from the Still App v2 mockup.

**Architecture:** Each feature follows the existing route pattern: a Prisma model, a `*-dto.ts` serializer in `app/lib`, `queries.ts` (server-only reads) and `actions.ts` (`'use server'` mutations) that both call `verifySession()`, a server `page.tsx`, and a client `*-board.tsx` orchestrator that owns state and renders small presentational components. Pure logic lives in `*-views.ts` / `app/lib/finance.ts` and is unit tested; DB code has integration tests against the real database; components have RTL tests.

**Tech Stack:** Next.js 16 (App Router, React 19, React Compiler), Prisma 7 + Postgres (`@prisma/adapter-pg`), Vitest 5 + Testing Library (jsdom), plain CSS in `app/styles/layout.css` using the Still tokens.

**Spec:** `docs/superpowers/specs/2026-09-26-notes-finance-design.md`

## Global Constraints

- Journal is removed entirely, including the `journal_entries` table and its data, and the `Mood` enum.
- Navigation order: Today, Tasks, Calendar, Matrix, Habits, Notes, Finance — all 7 in both sidebar and bottom nav.
- Currency: Algerian dinar, formatted with `Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', minimumFractionDigits: 0, maximumFractionDigits: 2 })` (e.g. `12 345,5 DA`). No currency setting.
- Money is stored as integer centimes (1/100 DZD), always positive; the entry `type` gives the sign. Max amount `2147483647` centimes (Postgres `INTEGER`).
- Expense categories: Housing, Groceries, Dining, Transport, Bills, Shopping, Health, Fun, Other. Income categories: Salary, Freelance, Gifts, Refund, Other.
- Month range clamp: 1900-01 … 2100-12 (reuse `MIN_MONTH_INDEX` / `MAX_MONTH_INDEX` from `app/lib/calendar-units.ts`).
- Out of scope: Today/Dashboard widgets (Dashboard stays the stub), editing finance entries, custom categories, budgets, recurring entries, note formatting/tags.
- Action failures: roll back optimistic state and `window.alert('Could not … Please try again.')` — the pattern Tasks/Habits use.
- Per `AGENTS.md`: this is Next 16 — check `node_modules/next/dist/docs/` before using any Next API not already used in this repo. `page.tsx` `searchParams` is a `Promise` (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`).
- Integration tests (`*.integration.test.ts`) run against `DATABASE_URL` from `.env` and must only delete rows they created.
- Commits end with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM
  ```

## Commands

- Unit + component tests: `npm test` (or `npx vitest run <path>` for one file)
- Integration tests: `npx vitest run <path>.integration.test.ts` (needs Postgres from `.env` running)
- Types: `npx tsc --noEmit`
- Lint: `npm run lint`
- Migration: `npx prisma migrate dev --name <name>` (also regenerates the client)

## File Map

**Delete:** `app/(app)/journal/**`, `app/lib/journal-dto.ts`

**Modify:**
- `prisma/schema.prisma` — drop `Mood`/`JournalEntry`; add `Note`, `EntryType`, `FinanceEntry`
- `app/components/shell/nav-items.ts` — nav list
- `app/components/icons.tsx` (+ test) — `sticky-note`, `wallet`, `search`, `pin`
- `app/components/ui/dialog.tsx` (+ test) — optional `description` and `width`
- `app/lib/date-format.ts` (+ new test cases) — `relativeTime`
- `app/styles/layout.css` — remove Journal CSS; add Notes and Finance CSS
- `app/layout.tsx` — metadata description
- `app/(app)/stub-pages.test.tsx` — comment

**Create (Notes):** `app/lib/note-dto.ts`, `app/(app)/notes/{queries.ts, actions.ts, notes-views.ts, note-composer.tsx, note-card.tsx, note-dialog.tsx, notes-board.tsx, page.tsx}` plus tests.

**Create (Finance):** `app/lib/finance.ts`, `app/lib/finance-dto.ts`, `app/(app)/finance/{queries.ts, actions.ts, finance-views.ts, month-switcher.tsx, finance-totals.tsx, category-breakdown.tsx, month-chart.tsx, entry-form.tsx, entry-list.tsx, finance-board.tsx, page.tsx}` plus tests.

---

### Task 1: Remove Journal

**Files:**
- Delete: `app/(app)/journal/` (whole directory), `app/lib/journal-dto.ts`
- Modify: `app/components/shell/nav-items.ts`, `app/styles/layout.css`, `app/layout.tsx:7`, `app/(app)/stub-pages.test.tsx:5-10`, `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_drop_journal/migration.sql` (generated)

**Interfaces:**
- Produces: `NAV_ITEMS` without a `journal` entry; schema without `JournalEntry`/`Mood`.

- [ ] **Step 1: Delete the Journal code**

```bash
git rm -r -q "app/(app)/journal" app/lib/journal-dto.ts
```

- [ ] **Step 2: Remove the nav item**

In `app/components/shell/nav-items.ts`, delete this line:

```ts
  { key: 'journal', label: 'Journal', href: '/journal', icon: 'book' },
```

- [ ] **Step 3: Remove the Journal CSS**

In `app/styles/layout.css`, delete the whole `/* ---------- Journal ---------- */` block (the five `.pw-journal-card` / `.pw-journal-entry` rules) and this media block:

```css
@media (max-width: 1100px) {
  .pw-journal-grid { grid-template-columns: minmax(0, 1fr) !important; }
}
```

- [ ] **Step 4: Update the metadata description and the stub-page comment**

`app/layout.tsx` line 7 becomes:

```ts
  description: "Personal productivity: tasks, calendar, matrix, habits, notes, finance.",
```

In `app/(app)/stub-pages.test.tsx`, replace the comment above `const pages` with:

```ts
// Tasks, Matrix, Calendar, Habits, Notes and Finance are real pages with their
// own board tests, so they are intentionally excluded from this table-driven
// stub-page test. Dashboard is deferred and is the only stub remaining.
```

- [ ] **Step 5: Drop the model and enum from the schema**

In `prisma/schema.prisma`, delete the `enum Mood { … }` block and the `model JournalEntry { … }` block.

- [ ] **Step 6: Generate and check the migration**

Run: `npx prisma migrate dev --name drop_journal`

Prisma warns that the table has data and will be lost — accept (the user chose to drop it). Then open the generated `prisma/migrations/*_drop_journal/migration.sql`. Expected content:

```sql
-- DropTable
DROP TABLE "journal_entries";

-- DropEnum
DROP TYPE "Mood";
```

- [ ] **Step 7: Verify nothing references Journal**

Run: `git grep -n -i -E "journal|Mood\b" -- app prisma/schema.prisma`
Expected: no output.

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm test` — Expected: all pass (the shell tests iterate `NAV_ITEMS`, so they adapt).
Run: `npm run lint` — Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A app prisma
git commit -m "feat: remove the Journal feature and drop the journal_entries table

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 2: Shared pieces — icons, `relativeTime`, Dialog description/width

**Files:**
- Modify: `app/components/icons.tsx`, `app/components/icons.test.tsx`
- Modify: `app/lib/date-format.ts`, `app/lib/date-format.test.ts`
- Modify: `app/components/ui/dialog.tsx`, `app/components/ui/dialog.test.tsx`

**Interfaces:**
- Produces:
  - `IconName` gains `'sticky-note' | 'wallet' | 'search' | 'pin'`
  - `relativeTime(iso: string, now: Date): string`
  - `DialogProps` gains `description?: string` and `width?: number` (max width in px, default 460)

- [ ] **Step 1: Write the failing tests**

In `app/components/icons.test.tsx`, add the new names to `ALL_ICONS`:

```ts
const ALL_ICONS: IconName[] = [
  'home', 'check-square', 'calendar', 'grid', 'flame', 'book',
  'plus', 'check', 'left', 'right', 'trash', 'pencil', 'grip',
  'flag', 'panel', 'menu', 'ban', 'sun', 'moon',
  'x', 'list-checks', 'repeat', 'grid-2x2', 'panel-close', 'panel-open',
  'chevrons-up-down', 'folder-plus', 'sticky-note', 'wallet', 'search', 'pin',
];
```

Append to `app/lib/date-format.test.ts` (add `relativeTime` to its existing import from `./date-format`; keep the file's existing imports otherwise):

```ts
describe('relativeTime', () => {
  const now = new Date('2026-09-26T12:00:00');

  test('under a minute is "just now"', () => {
    expect(relativeTime(new Date('2026-09-26T11:59:30').toISOString(), now)).toBe('just now');
  });

  test('minutes, hours and days', () => {
    expect(relativeTime(new Date('2026-09-26T11:55:00').toISOString(), now)).toBe('5m ago');
    expect(relativeTime(new Date('2026-09-26T09:00:00').toISOString(), now)).toBe('3h ago');
    expect(relativeTime(new Date('2026-09-24T12:00:00').toISOString(), now)).toBe('2d ago');
  });

  test('older than 7 days shows a short date, adding the year only when it differs', () => {
    expect(relativeTime(new Date('2026-09-12T08:00:00').toISOString(), now)).toBe('12 Sep');
    expect(relativeTime(new Date('2025-03-04T08:00:00').toISOString(), now)).toBe('4 Mar 2025');
  });

  test('a timestamp in the future is "just now"', () => {
    expect(relativeTime(new Date('2026-09-26T12:05:00').toISOString(), now)).toBe('just now');
  });
});
```

If `date-format.test.ts` does not already import `describe`/`test`/`expect`, they come from `'vitest'`.

Append to `app/components/ui/dialog.test.tsx` inside the `describe('Dialog', …)` block:

```tsx
  test('renders an optional description under the title', () => {
    render(<Dialog open onClose={vi.fn()} title="Note" description="Edited 3h ago"><p>content</p></Dialog>);
    expect(screen.getByText('Edited 3h ago')).toBeInTheDocument();
  });

  test('uses the width prop as the panel max width (default 460)', () => {
    const { rerender } = render(<Dialog open onClose={vi.fn()} title="Note"><p>content</p></Dialog>);
    expect(screen.getByRole('dialog')).toHaveStyle({ maxWidth: '460px' });
    rerender(<Dialog open onClose={vi.fn()} title="Note" width={560}><p>content</p></Dialog>);
    expect(screen.getByRole('dialog')).toHaveStyle({ maxWidth: '560px' });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/components/icons.test.tsx app/lib/date-format.test.ts app/components/ui/dialog.test.tsx`
Expected: FAIL — unknown icon names render empty svgs, `relativeTime` is not exported, description not rendered / maxWidth stays 460.

- [ ] **Step 3: Add the icons**

In `app/components/icons.tsx`, extend the union:

```ts
export type IconName =
  | 'home' | 'check-square' | 'calendar' | 'grid' | 'flame' | 'book'
  | 'plus' | 'check' | 'left' | 'right' | 'trash' | 'pencil' | 'grip'
  | 'flag' | 'panel' | 'menu' | 'ban' | 'sun' | 'moon'
  | 'x' | 'list-checks' | 'repeat' | 'grid-2x2' | 'panel-close' | 'panel-open'
  | 'chevrons-up-down' | 'folder-plus' | 'sticky-note' | 'wallet' | 'search' | 'pin';
```

and add these entries at the end of `PATHS` (Lucide paths):

```tsx
  'sticky-note': (
    <>
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
      <path d="M15 3v4a2 2 0 0 0 2 2h4" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </>
  ),
```

- [ ] **Step 4: Add `relativeTime`**

Append to `app/lib/date-format.ts`:

```ts
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "just now", "5m ago", "3h ago", "2d ago", then "12 Sep" (plus the year if it isn't the current one). */
export function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days}d ago`;
  const label = `${then.getDate()} ${SHORT_MONTHS[then.getMonth()]}`;
  return then.getFullYear() === now.getFullYear() ? label : `${label} ${then.getFullYear()}`;
}
```

- [ ] **Step 5: Add `description` and `width` to Dialog**

In `app/components/ui/dialog.tsx`:

```tsx
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Small muted line under the title, e.g. "Edited 3h ago". */
  description?: string;
  /** Max panel width in px. */
  width?: number;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, description, width = 460, children }: DialogProps) {
```

change the panel's `maxWidth: 460,` to `maxWidth: width,`, and replace the title `<h3 …>{title}</h3>` with:

```tsx
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{title}</h3>
            {description && <p className="st-eyebrow" style={{ margin: 0 }}>{description}</p>}
          </div>
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run app/components/icons.test.tsx app/lib/date-format.test.ts app/components/ui/dialog.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/components/icons.tsx app/components/icons.test.tsx app/lib/date-format.ts app/lib/date-format.test.ts app/components/ui/dialog.tsx app/components/ui/dialog.test.tsx
git commit -m "feat: add note/finance icons, relativeTime, and Dialog description/width

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 3: Notes data layer — model, DTO, queries, actions

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_notes/migration.sql` (generated)
- Create: `app/lib/note-dto.ts`, `app/(app)/notes/queries.ts`, `app/(app)/notes/actions.ts`
- Test: `app/(app)/notes/queries.integration.test.ts`, `app/(app)/notes/actions.integration.test.ts`

**Interfaces:**
- Produces:
  - `interface NoteDTO { id: string; text: string; pinned: boolean; createdAt: string; updatedAt: string }` (ISO timestamps), `serializeNote(note)` — in `app/lib/note-dto.ts`
  - `getNotes(): Promise<NoteDTO[]>` (re-exports `type NoteDTO`) — `app/(app)/notes/queries.ts`
  - `createNote(text: string): Promise<NoteDTO>`, `updateNote(id: string, text: string): Promise<NoteDTO>`, `setNotePinned(id: string, pinned: boolean): Promise<NoteDTO>`, `deleteNote(id: string): Promise<void>` — `app/(app)/notes/actions.ts`

- [ ] **Step 1: Add the model and migrate**

Append to `prisma/schema.prisma`:

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

Run: `npx prisma migrate dev --name notes`
Expected: a new `*_notes/migration.sql` with `CREATE TABLE "notes"`, and "Generated Prisma Client".

- [ ] **Step 2: Write the DTO**

Create `app/lib/note-dto.ts`:

```ts
export interface NoteDTO {
  id: string;
  text: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export function serializeNote(note: { id: string; text: string; pinned: boolean; createdAt: Date; updatedAt: Date }): NoteDTO {
  return {
    id: note.id,
    text: note.text,
    pinned: note.pinned,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 3: Write the failing integration tests**

Create `app/(app)/notes/queries.integration.test.ts`:

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

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { getNotes } from './queries';

describe('getNotes', () => {
  const created: string[] = [];

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.note.deleteMany({ where: { id: { in: created.splice(0) } } });
  });

  test('returns notes serialized with ISO timestamps', async () => {
    const note = await prisma.note.create({ data: { text: 'Query test note', pinned: true } });
    created.push(note.id);

    const result = await getNotes();
    const found = result.find((n) => n.id === note.id);
    expect(found).toEqual({
      id: note.id,
      text: 'Query test note',
      pinned: true,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  });

  test('redirects to /login without a session', async () => {
    cookieStore.clear();
    await expect(getNotes()).rejects.toThrow('REDIRECT:/login');
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });
});
```

Create `app/(app)/notes/actions.integration.test.ts`:

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
import { createNote, updateNote, setNotePinned, deleteNote } from './actions';

describe('note actions', () => {
  const created: string[] = [];

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.note.deleteMany({ where: { id: { in: created.splice(0) } } });
    vi.mocked(revalidatePath).mockClear();
  });

  test('createNote trims the text, stores an unpinned note and revalidates /notes', async () => {
    const note = await createNote('  Buy stamps  ');
    created.push(note.id);
    expect(note.text).toBe('Buy stamps');
    expect(note.pinned).toBe(false);
    const row = await prisma.note.findUnique({ where: { id: note.id } });
    expect(row?.text).toBe('Buy stamps');
    expect(revalidatePath).toHaveBeenCalledWith('/notes');
  });

  test('createNote rejects blank text', async () => {
    await expect(createNote('   ')).rejects.toThrow('Note text is required');
  });

  test('updateNote saves the text and bumps updatedAt', async () => {
    const note = await createNote('Before');
    created.push(note.id);
    const updated = await updateNote(note.id, 'After\nsecond line');
    expect(updated.text).toBe('After\nsecond line');
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(note.updatedAt).getTime());
  });

  test('setNotePinned toggles pinned without changing updatedAt', async () => {
    const note = await createNote('Pin me');
    created.push(note.id);
    const pinned = await setNotePinned(note.id, true);
    expect(pinned.pinned).toBe(true);
    expect(pinned.updatedAt).toBe(note.updatedAt);
    const unpinned = await setNotePinned(note.id, false);
    expect(unpinned.pinned).toBe(false);
  });

  test('deleteNote removes the row', async () => {
    const note = await createNote('Delete me');
    await deleteNote(note.id);
    expect(await prisma.note.findUnique({ where: { id: note.id } })).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/notes');
  });
});
```

- [ ] **Step 4: Run them to verify they fail**

Run: `npx vitest run "app/(app)/notes/queries.integration.test.ts" "app/(app)/notes/actions.integration.test.ts"`
Expected: FAIL — `./queries` / `./actions` cannot be resolved.

- [ ] **Step 5: Implement queries and actions**

Create `app/(app)/notes/queries.ts`:

```ts
import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { serializeNote, type NoteDTO } from '@/app/lib/note-dto';

export type { NoteDTO };

export async function getNotes(): Promise<NoteDTO[]> {
  await verifySession();
  const notes = await prisma.note.findMany({ orderBy: { updatedAt: 'desc' } });
  return notes.map(serializeNote);
}
```

Create `app/(app)/notes/actions.ts`:

```ts
'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import { serializeNote, type NoteDTO } from '@/app/lib/note-dto';

export async function createNote(text: string): Promise<NoteDTO> {
  await verifySession();
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Note text is required');
  const note = await prisma.note.create({ data: { text: trimmed } });
  revalidatePath('/notes');
  return serializeNote(note);
}

// Saves the text as typed (trailing newlines and all). Blank notes are
// deleted by the client when the edit dialog closes, not here.
export async function updateNote(id: string, text: string): Promise<NoteDTO> {
  await verifySession();
  const note = await prisma.note.update({ where: { id }, data: { text } });
  revalidatePath('/notes');
  return serializeNote(note);
}

// Pinning is not an edit, so updatedAt is written back unchanged
// (Prisma only auto-sets @updatedAt when the field isn't given).
export async function setNotePinned(id: string, pinned: boolean): Promise<NoteDTO> {
  await verifySession();
  const existing = await prisma.note.findUniqueOrThrow({ where: { id } });
  const note = await prisma.note.update({ where: { id }, data: { pinned, updatedAt: existing.updatedAt } });
  revalidatePath('/notes');
  return serializeNote(note);
}

export async function deleteNote(id: string): Promise<void> {
  await verifySession();
  await prisma.note.delete({ where: { id } });
  revalidatePath('/notes');
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run "app/(app)/notes/queries.integration.test.ts" "app/(app)/notes/actions.integration.test.ts"`
Expected: PASS. If `setNotePinned … without changing updatedAt` fails, Prisma is overriding the explicit value — replace the update with `prisma.$executeRaw\`UPDATE "notes" SET "pinned" = ${pinned} WHERE "id" = ${id}\`` followed by `findUniqueOrThrow`, and rerun.

- [ ] **Step 7: Commit**

```bash
git add prisma app/lib/note-dto.ts "app/(app)/notes"
git commit -m "feat: add Note model with notes queries and server actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 4: Notes view helpers — sort and filter

**Files:**
- Create: `app/(app)/notes/notes-views.ts`
- Test: `app/(app)/notes/notes-views.test.ts`

**Interfaces:**
- Consumes: `NoteDTO` from `app/lib/note-dto.ts`
- Produces: `sortNotes(notes: NoteDTO[]): NoteDTO[]`, `filterNotes(notes: NoteDTO[], query: string): NoteDTO[]` (both return new arrays)

- [ ] **Step 1: Write the failing test**

Create `app/(app)/notes/notes-views.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { sortNotes, filterNotes } from './notes-views';
import type { NoteDTO } from '@/app/lib/note-dto';

function note(id: string, overrides: Partial<NoteDTO> = {}): NoteDTO {
  return { id, text: id, pinned: false, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', ...overrides };
}

describe('sortNotes', () => {
  test('pinned first, then most recently updated first', () => {
    const notes = [
      note('old', { updatedAt: '2026-09-01T00:00:00.000Z' }),
      note('new', { updatedAt: '2026-09-20T00:00:00.000Z' }),
      note('pinned-old', { pinned: true, updatedAt: '2026-08-01T00:00:00.000Z' }),
    ];
    expect(sortNotes(notes).map((n) => n.id)).toEqual(['pinned-old', 'new', 'old']);
  });

  test('does not mutate its input', () => {
    const notes = [note('a', { updatedAt: '2026-09-01T00:00:00.000Z' }), note('b', { updatedAt: '2026-09-02T00:00:00.000Z' })];
    sortNotes(notes);
    expect(notes.map((n) => n.id)).toEqual(['a', 'b']);
  });
});

describe('filterNotes', () => {
  const notes = [note('1', { text: 'Buy Milk' }), note('2', { text: 'call the bank' })];

  test('blank query returns every note', () => {
    expect(filterNotes(notes, '   ')).toHaveLength(2);
  });

  test('case-insensitive substring match', () => {
    expect(filterNotes(notes, 'milk').map((n) => n.id)).toEqual(['1']);
    expect(filterNotes(notes, ' BANK ').map((n) => n.id)).toEqual(['2']);
    expect(filterNotes(notes, 'zzz')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "app/(app)/notes/notes-views.test.ts"`
Expected: FAIL — cannot resolve `./notes-views`.

- [ ] **Step 3: Implement**

Create `app/(app)/notes/notes-views.ts`:

```ts
import type { NoteDTO } from '@/app/lib/note-dto';

/** Pinned notes first, then most recently edited. ISO strings sort chronologically. */
export function sortNotes(notes: NoteDTO[]): NoteDTO[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
  });
}

export function filterNotes(notes: NoteDTO[], query: string): NoteDTO[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...notes];
  return notes.filter((n) => n.text.toLowerCase().includes(q));
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run "app/(app)/notes/notes-views.test.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/notes/notes-views.ts" "app/(app)/notes/notes-views.test.ts"
git commit -m "feat: add note sort and search helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 5: Notes presentational components — composer, card, dialog

**Files:**
- Create: `app/(app)/notes/note-composer.tsx`, `app/(app)/notes/note-card.tsx`, `app/(app)/notes/note-dialog.tsx`
- Test: `app/(app)/notes/note-composer.test.tsx`, `app/(app)/notes/note-card.test.tsx`, `app/(app)/notes/note-dialog.test.tsx`

**Interfaces:**
- Consumes: `NoteDTO`; `relativeTime` (Task 2); `Dialog` with `description`/`width` (Task 2); `Icon` names `pin`, `trash`; `Button`, `IconButton`
- Produces:
  - `NoteComposer({ onSave }: { onSave: (text: string) => Promise<boolean> })` — clears only when `onSave` resolves `true`
  - `NoteCard({ note, now, onOpen, onTogglePin, onDelete }: { note: NoteDTO; now: Date; onOpen: () => void; onTogglePin: () => void; onDelete: () => void })`
  - `NoteDialog({ note, description, onTextChange, onDelete, onClose }: { note: NoteDTO | null; description: string; onTextChange: (text: string) => void; onDelete: () => void; onClose: () => void })`

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/notes/note-composer.test.tsx`:

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { NoteComposer } from './note-composer';

describe('NoteComposer', () => {
  test('Save sends the trimmed text and clears the box on success', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<NoteComposer onSave={onSave} />);
    const box = screen.getByPlaceholderText("What's on your mind?");
    fireEvent.change(box, { target: { value: '  Call mom  ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(onSave).toHaveBeenCalledWith('Call mom');
    expect(box).toHaveValue('');
  });

  test('Ctrl+Enter and Cmd+Enter save; plain Enter does not', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<NoteComposer onSave={onSave} />);
    const box = screen.getByPlaceholderText("What's on your mind?");
    fireEvent.change(box, { target: { value: 'one' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    });
    expect(onSave).toHaveBeenCalledWith('one');
    fireEvent.change(box, { target: { value: 'two' } });
    await act(async () => {
      fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
    });
    expect(onSave).toHaveBeenLastCalledWith('two');
  });

  test('blank text does nothing', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<NoteComposer onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), { target: { value: '   ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  test('keeps the text when the save fails', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<NoteComposer onSave={onSave} />);
    const box = screen.getByPlaceholderText("What's on your mind?");
    fireEvent.change(box, { target: { value: 'keep me' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(box).toHaveValue('keep me');
  });
});
```

Create `app/(app)/notes/note-card.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { NoteCard } from './note-card';
import type { NoteDTO } from '@/app/lib/note-dto';

const now = new Date('2026-09-26T12:00:00');
const base: NoteDTO = {
  id: 'n1',
  text: 'First line\nSecond line',
  pinned: false,
  createdAt: '2026-09-26T09:00:00.000Z',
  updatedAt: new Date('2026-09-26T09:00:00').toISOString(),
};

function setup(note: NoteDTO = base) {
  const handlers = { onOpen: vi.fn(), onTogglePin: vi.fn(), onDelete: vi.fn() };
  render(<NoteCard note={note} now={now} {...handlers} />);
  return handlers;
}

describe('NoteCard', () => {
  test('shows the text and relative edit time', () => {
    setup();
    expect(screen.getByText(/First line/)).toBeInTheDocument();
    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  test('clicking the text opens the note', () => {
    const h = setup();
    fireEvent.click(screen.getByText(/First line/));
    expect(h.onOpen).toHaveBeenCalledOnce();
  });

  test('pin and delete call their handlers without opening', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(h.onTogglePin).toHaveBeenCalledOnce();
    expect(h.onDelete).toHaveBeenCalledOnce();
    expect(h.onOpen).not.toHaveBeenCalled();
  });

  test('a pinned note shows a pressed Unpin button', () => {
    setup({ ...base, pinned: true });
    expect(screen.getByRole('button', { name: 'Unpin' })).toHaveAttribute('aria-pressed', 'true');
  });
});
```

Create `app/(app)/notes/note-dialog.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { NoteDialog } from './note-dialog';
import type { NoteDTO } from '@/app/lib/note-dto';

const note: NoteDTO = { id: 'n1', text: 'Hello', pinned: false, createdAt: '2026-09-26T09:00:00.000Z', updatedAt: '2026-09-26T09:00:00.000Z' };

function setup(n: NoteDTO | null = note) {
  const handlers = { onTextChange: vi.fn(), onDelete: vi.fn(), onClose: vi.fn() };
  render(<NoteDialog note={n} description="Edited 3h ago" {...handlers} />);
  return handlers;
}

describe('NoteDialog', () => {
  test('is closed when there is no note', () => {
    setup(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows the text and description, and reports edits', () => {
    const h = setup();
    expect(screen.getByRole('dialog', { name: 'Note' })).toBeInTheDocument();
    expect(screen.getByText('Edited 3h ago')).toBeInTheDocument();
    const box = screen.getByLabelText('Note text');
    expect(box).toHaveValue('Hello');
    fireEvent.change(box, { target: { value: 'Hello there' } });
    expect(h.onTextChange).toHaveBeenCalledWith('Hello there');
  });

  test('Delete and Done call their handlers', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(h.onDelete).toHaveBeenCalledOnce();
    expect(h.onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run "app/(app)/notes/note-composer.test.tsx" "app/(app)/notes/note-card.test.tsx" "app/(app)/notes/note-dialog.test.tsx"`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the composer**

Create `app/(app)/notes/note-composer.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';

export interface NoteComposerProps {
  /** Resolves true when the note was saved; the box clears only then. */
  onSave: (text: string) => Promise<boolean>;
}

export function NoteComposer({ onSave }: NoteComposerProps) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    const ok = await onSave(text);
    setSaving(false);
    if (ok) setDraft('');
  }

  return (
    <div className="pw-note-compose">
      <textarea
        aria-label="New note"
        rows={3}
        placeholder="What's on your mind?"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void save();
          }
        }}
      />
      <div className="pw-note-compose-foot">
        <span className="st-eyebrow">⌘ ↵</span>
        <Button size="sm" onClick={() => void save()} disabled={saving}>
          Save
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement the card**

Create `app/(app)/notes/note-card.tsx`:

```tsx
'use client';

import { Icon } from '@/app/components/icons';
import { IconButton } from '@/app/components/ui/icon-button';
import { relativeTime } from '@/app/lib/date-format';
import type { NoteDTO } from '@/app/lib/note-dto';

export interface NoteCardProps {
  note: NoteDTO;
  now: Date;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

export function NoteCard({ note, now, onOpen, onTogglePin, onDelete }: NoteCardProps) {
  return (
    <div className="pw-note-card">
      <button type="button" className="pw-note-card-body" onClick={onOpen}>
        <span className="pw-note-card-text">{note.text}</span>
      </button>
      <div className="pw-note-card-foot">
        {/* Server and browser clocks differ, so the relative time may too. */}
        <span className="st-due" style={{ flex: 1 }} suppressHydrationWarning>
          {relativeTime(note.updatedAt, now)}
        </span>
        <IconButton label={note.pinned ? 'Unpin' : 'Pin'} size="sm" aria-pressed={note.pinned} onClick={onTogglePin}>
          <Icon name="pin" size={15} />
        </IconButton>
        <IconButton label="Delete" size="sm" onClick={onDelete}>
          <Icon name="trash" size={15} />
        </IconButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement the dialog**

Create `app/(app)/notes/note-dialog.tsx`:

```tsx
'use client';

import { Dialog } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/icons';
import type { NoteDTO } from '@/app/lib/note-dto';

export interface NoteDialogProps {
  note: NoteDTO | null;
  description: string;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NoteDialog({ note, description, onTextChange, onDelete, onClose }: NoteDialogProps) {
  return (
    <Dialog open={note !== null} onClose={onClose} title="Note" description={description} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <textarea
          aria-label="Note text"
          className="pw-note-editor"
          rows={10}
          autoFocus
          value={note?.text ?? ''}
          onChange={(e) => onTextChange(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Icon name="trash" size={15} />
            Delete
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run "app/(app)/notes/note-composer.test.tsx" "app/(app)/notes/note-card.test.tsx" "app/(app)/notes/note-dialog.test.tsx"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/notes/note-composer.tsx" "app/(app)/notes/note-composer.test.tsx" "app/(app)/notes/note-card.tsx" "app/(app)/notes/note-card.test.tsx" "app/(app)/notes/note-dialog.tsx" "app/(app)/notes/note-dialog.test.tsx"
git commit -m "feat: add note composer, card and edit dialog components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 6: NotesBoard, `/notes` page, nav item and CSS

**Files:**
- Create: `app/(app)/notes/notes-board.tsx`, `app/(app)/notes/page.tsx`
- Test: `app/(app)/notes/notes-board.test.tsx`
- Modify: `app/components/shell/nav-items.ts`, `app/styles/layout.css`

**Interfaces:**
- Consumes: Tasks 2–5 (`getNotes`, the four actions, `sortNotes`, `filterNotes`, `NoteComposer`, `NoteCard`, `NoteDialog`, `relativeTime`, `Icon 'search' | 'sticky-note'`)
- Produces: `NotesBoard({ initialNotes }: { initialNotes: NoteDTO[] })`; route `/notes`; nav item `{ key: 'notes', label: 'Notes', href: '/notes', icon: 'sticky-note' }`

- [ ] **Step 1: Write the failing board test**

Create `app/(app)/notes/notes-board.test.tsx`:

```tsx
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotesBoard } from './notes-board';
import * as actions from './actions';
import type { NoteDTO } from '@/app/lib/note-dto';

vi.mock('./actions', () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  setNotePinned: vi.fn(),
  deleteNote: vi.fn(),
}));

function makeNote(id: string, overrides: Partial<NoteDTO> = {}): NoteDTO {
  return { id, text: `Note ${id}`, pinned: false, createdAt: '2026-09-20T10:00:00.000Z', updatedAt: '2026-09-20T10:00:00.000Z', ...overrides };
}

describe('NotesBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T12:00:00'));
    window.alert = vi.fn();
    vi.mocked(actions.updateNote).mockImplementation(async (id, text) => makeNote(id, { text }));
    vi.mocked(actions.setNotePinned).mockImplementation(async (id, pinned) => makeNote(id, { pinned }));
    vi.mocked(actions.deleteNote).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows the count, and pinned notes before newer unpinned ones', () => {
    render(
      <NotesBoard
        initialNotes={[
          makeNote('a', { text: 'Newer', updatedAt: '2026-09-25T10:00:00.000Z' }),
          makeNote('b', { text: 'Pinned', pinned: true }),
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: /Notes/ })).toHaveTextContent('2');
    const texts = screen.getAllByRole('button', { name: /Newer|Pinned/ }).map((b) => b.textContent);
    expect(texts).toEqual(['Pinned', 'Newer']);
  });

  test('empty state and search', () => {
    const { unmount } = render(<NotesBoard initialNotes={[]} />);
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
    unmount();
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Buy milk' }), makeNote('b', { text: 'Bank' })]} />);
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'MILK' } });
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.queryByText('Bank')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'zzz' } });
    expect(screen.getByText('No matches.')).toBeInTheDocument();
  });

  test('saving from the composer adds the note to the grid', async () => {
    vi.mocked(actions.createNote).mockResolvedValue(makeNote('new', { text: 'Fresh note' }));
    render(<NotesBoard initialNotes={[]} />);
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), { target: { value: 'Fresh note' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(actions.createNote).toHaveBeenCalledWith('Fresh note');
    expect(screen.getByText('Fresh note')).toBeInTheDocument();
  });

  test('a failed create alerts and keeps the draft', async () => {
    vi.mocked(actions.createNote).mockRejectedValue(new Error('boom'));
    render(<NotesBoard initialNotes={[]} />);
    const box = screen.getByPlaceholderText("What's on your mind?");
    fireEvent.change(box, { target: { value: 'Oops' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(window.alert).toHaveBeenCalled();
    expect(box).toHaveValue('Oops');
  });

  test('pin is optimistic and rolls back on failure', async () => {
    vi.mocked(actions.setNotePinned).mockRejectedValue(new Error('boom'));
    render(<NotesBoard initialNotes={[makeNote('a')]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    });
    expect(actions.setNotePinned).toHaveBeenCalledWith('a', true);
    expect(window.alert).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pin' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('delete removes the card', async () => {
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Bye' })]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });
    expect(actions.deleteNote).toHaveBeenCalledWith('a');
    expect(screen.queryByText('Bye')).not.toBeInTheDocument();
  });

  test('editing in the dialog debounces the save and Done flushes it', () => {
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Draft' })]} />);
    fireEvent.click(screen.getByText('Draft'));
    const box = within(screen.getByRole('dialog')).getByLabelText('Note text');
    fireEvent.change(box, { target: { value: 'Draft v2' } });
    expect(actions.updateNote).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(actions.updateNote).toHaveBeenCalledWith('a', 'Draft v2');
    fireEvent.change(box, { target: { value: 'Draft v3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(actions.updateNote).toHaveBeenLastCalledWith('a', 'Draft v3');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Draft v3')).toBeInTheDocument();
  });

  test('closing the dialog with blank text deletes the note instead of saving', async () => {
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Soon empty' })]} />);
    fireEvent.click(screen.getByText('Soon empty'));
    fireEvent.change(screen.getByLabelText('Note text'), { target: { value: '  ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    });
    expect(actions.updateNote).not.toHaveBeenCalled();
    expect(actions.deleteNote).toHaveBeenCalledWith('a');
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  test('a failed autosave shows "Couldn\'t save" in the dialog', async () => {
    vi.mocked(actions.updateNote).mockRejectedValue(new Error('boom'));
    render(<NotesBoard initialNotes={[makeNote('a', { text: 'Draft' })]} />);
    fireEvent.click(screen.getByText('Draft'));
    fireEvent.change(screen.getByLabelText('Note text'), { target: { value: 'Draft v2' } });
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Couldn't save")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "app/(app)/notes/notes-board.test.tsx"`
Expected: FAIL — cannot resolve `./notes-board`.

- [ ] **Step 3: Implement the board**

Create `app/(app)/notes/notes-board.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PageHeader } from '@/app/components/shell/page-header';
import { Icon } from '@/app/components/icons';
import { Input } from '@/app/components/ui/input';
import { relativeTime } from '@/app/lib/date-format';
import { NoteComposer } from './note-composer';
import { NoteCard } from './note-card';
import { NoteDialog } from './note-dialog';
import { sortNotes, filterNotes } from './notes-views';
import { createNote, updateNote, setNotePinned, deleteNote } from './actions';
import type { NoteDTO } from '@/app/lib/note-dto';

const SAVE_DEBOUNCE_MS = 600;

export interface NotesBoardProps {
  initialNotes: NoteDTO[];
}

export function NotesBoard({ initialNotes }: NotesBoardProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const pendingRef = useRef<{ id: string; text: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    updateNote(pending.id, pending.text).then(
      () => setSaveFailed(false),
      () => {
        // Keep the failed save so the next edit or closing the dialog retries it.
        if (!pendingRef.current) pendingRef.current = pending;
        setSaveFailed(true);
      }
    );
  }, []);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  function scheduleSave(id: string, text: string) {
    pendingRef.current = { id, text };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushPendingSave();
    }, SAVE_DEBOUNCE_MS);
  }

  function cancelPendingSave() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }

  async function handleCreate(text: string): Promise<boolean> {
    try {
      const note = await createNote(text);
      setNotes((prev) => [note, ...prev]);
      return true;
    } catch {
      window.alert('Could not save the note. Please try again.');
      return false;
    }
  }

  async function handleTogglePin(note: NoteDTO) {
    const pinned = !note.pinned;
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned } : n)));
    try {
      await setNotePinned(note.id, pinned);
    } catch {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: note.pinned } : n)));
      window.alert('Could not update the note. Please try again.');
    }
  }

  async function handleDelete(note: NoteDTO) {
    if (pendingRef.current?.id === note.id) cancelPendingSave();
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    setEditingId((id) => (id === note.id ? null : id));
    try {
      await deleteNote(note.id);
    } catch {
      setNotes((prev) => [note, ...prev]);
      window.alert('Could not delete the note. Please try again.');
    }
  }

  function handleEditText(text: string) {
    if (!editingId) return;
    const updatedAt = new Date().toISOString();
    setNotes((prev) => prev.map((n) => (n.id === editingId ? { ...n, text, updatedAt } : n)));
    scheduleSave(editingId, text);
  }

  function handleClose() {
    const note = notes.find((n) => n.id === editingId);
    setEditingId(null);
    setSaveFailed(false);
    if (!note) return;
    if (!note.text.trim()) {
      void handleDelete(note);
      return;
    }
    flushPendingSave();
  }

  const now = new Date();
  const visible = filterNotes(sortNotes(notes), query);
  const editing = notes.find((n) => n.id === editingId) ?? null;
  const description = saveFailed ? "Couldn't save" : editing ? `Edited ${relativeTime(editing.updatedAt, now)}` : '';

  return (
    <div style={{ paddingBottom: 48 }}>
      <PageHeader
        title="Notes"
        meta={String(notes.length)}
        actions={
          <div className="pw-note-search">
            <Icon name="search" size={15} className="pw-note-search-icon" />
            <Input
              size="sm"
              type="search"
              aria-label="Search notes"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        }
      />
      <div className="pw-notes">
        <NoteComposer onSave={handleCreate} />
        {visible.length > 0 ? (
          <div className="pw-note-grid">
            {visible.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                now={now}
                onOpen={() => setEditingId(note.id)}
                onTogglePin={() => void handleTogglePin(note)}
                onDelete={() => void handleDelete(note)}
              />
            ))}
          </div>
        ) : (
          <p className="st-empty">{query.trim() ? 'No matches.' : 'No notes yet.'}</p>
        )}
      </div>
      <NoteDialog
        note={editing}
        description={description}
        onTextChange={handleEditText}
        onDelete={() => editing && void handleDelete(editing)}
        onClose={handleClose}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add the page, nav item and CSS**

Create `app/(app)/notes/page.tsx`:

```tsx
import { getNotes } from './queries';
import { NotesBoard } from './notes-board';

export default async function NotesPage() {
  const notes = await getNotes();
  return <NotesBoard initialNotes={notes} />;
}
```

In `app/components/shell/nav-items.ts`, add after the `habits` entry:

```ts
  { key: 'notes', label: 'Notes', href: '/notes', icon: 'sticky-note' },
```

Append to `app/styles/layout.css`:

```css
/* ---------- Notes ---------- */
.pw-notes { display: flex; flex-direction: column; gap: 24px; padding: 0 var(--pw-gutter); }
.pw-note-search { position: relative; width: 220px; max-width: 100%; }
.pw-note-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--fg-3); pointer-events: none; z-index: 1; }
.pw-note-compose { display: flex; flex-direction: column; gap: 8px; padding: 16px; background: var(--surface-1); border: 1px solid var(--border-2); border-radius: var(--radius-lg); transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out); }
.pw-note-compose:focus-within { border-color: var(--accent); box-shadow: var(--ring); }
.pw-note-compose textarea { width: 100%; border: none; outline: none; resize: none; background: transparent; color: var(--fg-1); font-family: var(--font-sans); font-size: 17px; line-height: 1.5; padding: 0; }
.pw-note-compose textarea:focus-visible { box-shadow: none; }
.pw-note-compose-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.pw-note-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 12px; align-items: start; }
.pw-note-card { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: var(--surface-1); border: 1px solid var(--border-1); border-radius: var(--radius-lg); transition: border-color var(--dur-fast) var(--ease-out); }
.pw-note-card:hover { border-color: var(--border-strong); }
.pw-note-card-body { appearance: none; border: none; background: transparent; padding: 0; margin: 0; text-align: left; color: var(--fg-1); font: inherit; cursor: pointer; }
.pw-note-card-text { white-space: pre-wrap; text-wrap: pretty; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; }
.pw-note-card-foot { display: flex; align-items: center; gap: 2px; }
.pw-note-editor { width: 100%; box-sizing: border-box; resize: vertical; border: 1px solid var(--border-2); border-radius: var(--radius-md); background: var(--surface-1); color: var(--fg-1); font-family: var(--font-sans); font-size: 15px; line-height: 1.6; padding: 12px; outline: none; }
.pw-note-editor:focus { border-color: var(--accent); box-shadow: var(--ring); }
@media (max-width: 560px) {
  .pw-note-search { width: 100%; }
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run "app/(app)/notes" app/components/shell`
Expected: PASS (board test plus the shell tests with the new nav item).

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run lint` — Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/notes" app/components/shell/nav-items.ts app/styles/layout.css
git commit -m "feat: add the Notes page with search, pinning and autosaving edit dialog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 7: Finance library — categories, money, amounts, months

**Files:**
- Create: `app/lib/finance.ts`
- Test: `app/lib/finance.test.ts`

**Interfaces:**
- Consumes: `MIN_MONTH_INDEX`, `MAX_MONTH_INDEX`, `monthIndexOfDateKey`, `firstOfMonthKey` from `app/lib/calendar-units.ts`
- Produces (all from `app/lib/finance.ts`; `EntryType` is Prisma's `'EXPENSE' | 'INCOME'`, but this module declares its own identical `EntryKind` so it has no Prisma import and is safe in client bundles):
  - `type EntryKind = 'EXPENSE' | 'INCOME'`
  - `EXPENSE_CATEGORIES: readonly string[]`, `INCOME_CATEGORIES: readonly string[]`
  - `categoriesFor(type: EntryKind): readonly string[]`, `defaultCategory(type: EntryKind): string` (`'Groceries'` / `'Salary'`)
  - `categoryColor(name: string): string` (CSS var)
  - `MAX_AMOUNT = 2147483647`
  - `formatMoney(centimes: number, opts?: { signed?: boolean }): string`
  - `parseAmount(input: string): number | null` (centimes)
  - `addMonthKey(month: string, n: number): string`, `parseMonthParam(value: string | undefined, fallback: string): string`, `monthKeyLabel(month: string): string` ("September 2026"), `monthShortLabel(month: string): string` ("Sep"), `monthIndexOfMonthKey(month: string): number`

- [ ] **Step 1: Write the failing test**

Create `app/lib/finance.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import {
  categoriesFor,
  defaultCategory,
  categoryColor,
  formatMoney,
  parseAmount,
  addMonthKey,
  parseMonthParam,
  monthKeyLabel,
  monthShortLabel,
  monthIndexOfMonthKey,
  MAX_AMOUNT,
} from './finance';

// fr-DZ groups thousands with a narrow no-break space (U+202F); normalize for readable assertions.
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('categories', () => {
  test('expense and income lists with their defaults', () => {
    expect(categoriesFor('EXPENSE')).toEqual(['Housing', 'Groceries', 'Dining', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun', 'Other']);
    expect(categoriesFor('INCOME')).toEqual(['Salary', 'Freelance', 'Gifts', 'Refund', 'Other']);
    expect(defaultCategory('EXPENSE')).toBe('Groceries');
    expect(defaultCategory('INCOME')).toBe('Salary');
  });

  test('colors come from the Still hues with a gray fallback', () => {
    expect(categoryColor('Groceries')).toBe('var(--moss-500)');
    expect(categoryColor('Salary')).toBe('var(--sage-500)');
    expect(categoryColor('Unknown')).toBe('var(--gray-400)');
  });
});

describe('formatMoney', () => {
  test('formats centimes as dinars', () => {
    expect(plain(formatMoney(0))).toBe('0 DA');
    expect(plain(formatMoney(123450))).toBe('1 234,5 DA');
    expect(plain(formatMoney(42000000))).toBe('420 000 DA');
    expect(plain(formatMoney(7))).toBe('0,07 DA');
  });

  test('negative values get a minus; signed adds a plus to positives', () => {
    expect(plain(formatMoney(-5000))).toBe('−50 DA');
    expect(plain(formatMoney(5000, { signed: true }))).toBe('+50 DA');
    expect(plain(formatMoney(-5000, { signed: true }))).toBe('−50 DA');
    expect(plain(formatMoney(0, { signed: true }))).toBe('0 DA');
  });
});

describe('parseAmount', () => {
  test('accepts dot or comma decimals and returns centimes', () => {
    expect(parseAmount('12')).toBe(1200);
    expect(parseAmount('12.5')).toBe(1250);
    expect(parseAmount(' 12,50 ')).toBe(1250);
    expect(parseAmount('0.07')).toBe(7);
  });

  test('rejects blank, non-numbers, zero, negatives, 3+ decimals and overflow', () => {
    for (const bad of ['', 'abc', '0', '0.00', '-5', '1.234', '1e3', '12.']) {
      expect(parseAmount(bad)).toBeNull();
    }
    expect(parseAmount(String(MAX_AMOUNT / 100 + 1))).toBeNull();
  });
});

describe('month keys', () => {
  test('addMonthKey crosses year boundaries', () => {
    expect(addMonthKey('2026-09', 1)).toBe('2026-10');
    expect(addMonthKey('2026-12', 1)).toBe('2027-01');
    expect(addMonthKey('2026-01', -1)).toBe('2025-12');
    expect(addMonthKey('2026-09', -5)).toBe('2026-04');
  });

  test('parseMonthParam validates and clamps, falling back when invalid', () => {
    expect(parseMonthParam('2026-03', '2026-09')).toBe('2026-03');
    expect(parseMonthParam(undefined, '2026-09')).toBe('2026-09');
    expect(parseMonthParam('2026-13', '2026-09')).toBe('2026-09');
    expect(parseMonthParam('garbage', '2026-09')).toBe('2026-09');
    expect(parseMonthParam('1800-05', '2026-09')).toBe('1900-01');
    expect(parseMonthParam('2200-05', '2026-09')).toBe('2100-12');
  });

  test('labels and index', () => {
    expect(monthKeyLabel('2026-09')).toBe('September 2026');
    expect(monthShortLabel('2026-09')).toBe('Sep');
    expect(monthIndexOfMonthKey('2026-01')).toBe(2026 * 12);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/lib/finance.test.ts`
Expected: FAIL — cannot resolve `./finance`.

- [ ] **Step 3: Implement**

Create `app/lib/finance.ts`:

```ts
import { MIN_MONTH_INDEX, MAX_MONTH_INDEX, monthIndexOfDateKey, firstOfMonthKey } from './calendar-units';

/** Same values as Prisma's EntryType; declared here so client code needn't import @prisma/client. */
export type EntryKind = 'EXPENSE' | 'INCOME';

export const EXPENSE_CATEGORIES: readonly string[] = ['Housing', 'Groceries', 'Dining', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun', 'Other'];
export const INCOME_CATEGORIES: readonly string[] = ['Salary', 'Freelance', 'Gifts', 'Refund', 'Other'];

export function categoriesFor(type: EntryKind): readonly string[] {
  return type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function defaultCategory(type: EntryKind): string {
  return type === 'INCOME' ? 'Salary' : 'Groceries';
}

const CATEGORY_COLOR: Record<string, string> = {
  Housing: 'var(--gray-500)',
  Groceries: 'var(--moss-500)',
  Dining: 'var(--amber-500)',
  Transport: 'var(--mist-500)',
  Bills: 'var(--sage-500)',
  Shopping: 'var(--clay-500)',
  Health: 'var(--moss-700)',
  Fun: 'var(--amber-700)',
  Other: 'var(--gray-400)',
  Salary: 'var(--sage-500)',
  Freelance: 'var(--mist-500)',
  Gifts: 'var(--amber-500)',
  Refund: 'var(--moss-500)',
};

export function categoryColor(name: string): string {
  return CATEGORY_COLOR[name] ?? 'var(--gray-400)';
}

/** Largest amount a Postgres INTEGER column holds, in centimes (21 474 836,47 DA). */
export const MAX_AMOUNT = 2147483647;

const MONEY = new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Centimes → "1 234,5 DA". Negatives get "−"; `signed` also puts "+" on positives. */
export function formatMoney(centimes: number, opts: { signed?: boolean } = {}): string {
  const text = MONEY.format(Math.abs(centimes) / 100);
  if (centimes < 0) return `−${text}`;
  if (opts.signed && centimes > 0) return `+${text}`;
  return text;
}

const AMOUNT_RE = /^\d+([.,]\d{1,2})?$/;

/** "12", "12.5", "12,50" → centimes; null if not a positive amount with at most 2 decimals. */
export function parseAmount(input: string): number | null {
  const trimmed = input.trim();
  if (!AMOUNT_RE.test(trimmed)) return null;
  const centimes = Math.round(Number(trimmed.replace(',', '.')) * 100);
  if (centimes <= 0 || centimes > MAX_AMOUNT) return null;
  return centimes;
}

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_RE = /^(\d{4})-(\d{2})$/;

/** A 'YYYY-MM' month key as year * 12 + zero-based month. */
export function monthIndexOfMonthKey(month: string): number {
  return monthIndexOfDateKey(`${month}-01`);
}

function monthKeyOfIndex(index: number): string {
  return firstOfMonthKey(index).slice(0, 7);
}

export function addMonthKey(month: string, n: number): string {
  return monthKeyOfIndex(monthIndexOfMonthKey(month) + n);
}

/** Validates a ?month=YYYY-MM value, clamped to 1900-01..2100-12. */
export function parseMonthParam(value: string | undefined, fallback: string): string {
  const match = value ? MONTH_RE.exec(value) : null;
  if (!match) return fallback;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return fallback;
  const index = Number(match[1]) * 12 + month - 1;
  return monthKeyOfIndex(Math.min(MAX_MONTH_INDEX, Math.max(MIN_MONTH_INDEX, index)));
}

export function monthKeyLabel(month: string): string {
  return `${MONTHS_LONG[Number(month.slice(5, 7)) - 1]} ${Number(month.slice(0, 4))}`;
}

export function monthShortLabel(month: string): string {
  return MONTHS_SHORT[Number(month.slice(5, 7)) - 1];
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run app/lib/finance.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/lib/finance.ts app/lib/finance.test.ts
git commit -m "feat: add finance categories, DZD money formatting, amount parsing and month keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 8: Finance data layer — model, DTO, queries, actions

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_finance_entries/migration.sql` (generated)
- Create: `app/lib/finance-dto.ts`, `app/(app)/finance/queries.ts`, `app/(app)/finance/actions.ts`
- Test: `app/(app)/finance/queries.integration.test.ts`, `app/(app)/finance/actions.integration.test.ts`

**Interfaces:**
- Consumes: `categoriesFor`, `addMonthKey`, `MAX_AMOUNT`, `EntryKind` (Task 7); `toDateKey` from `app/lib/task-dto.ts`
- Produces:
  - `interface FinanceEntryDTO { id: string; type: EntryKind; amount: number; category: string; note: string; date: string }` + `serializeFinanceEntry` — `app/lib/finance-dto.ts`
  - `getFinanceEntries(fromMonth: string, toMonth: string): Promise<FinanceEntryDTO[]>` (inclusive months, newest first)
  - `interface CreateFinanceEntryInput { type: EntryKind; amount: number; category: string; note: string; date: string }`, `createFinanceEntry(input): Promise<FinanceEntryDTO>`, `deleteFinanceEntry(id: string): Promise<void>`

- [ ] **Step 1: Add the model and migrate**

Append to `prisma/schema.prisma`:

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

Run: `npx prisma migrate dev --name finance_entries`
Expected: migration creating enum `EntryType`, table `finance_entries` and index `finance_entries_date_idx`.

- [ ] **Step 2: Write the DTO**

Create `app/lib/finance-dto.ts`:

```ts
import type { EntryKind } from './finance';
import { toDateKey } from './task-dto';

export interface FinanceEntryDTO {
  id: string;
  type: EntryKind;
  /** Centimes, always positive. */
  amount: number;
  category: string;
  note: string;
  /** 'YYYY-MM-DD' */
  date: string;
}

export function serializeFinanceEntry(entry: {
  id: string;
  type: EntryKind;
  amount: number;
  category: string;
  note: string;
  date: Date;
}): FinanceEntryDTO {
  return {
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    category: entry.category,
    note: entry.note,
    date: toDateKey(entry.date)!,
  };
}
```

- [ ] **Step 3: Write the failing integration tests**

Create `app/(app)/finance/queries.integration.test.ts`:

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

import { prisma } from '@/app/lib/prisma';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { getFinanceEntries } from './queries';

// Far-future dates keep these rows away from real data.
const DATES = ['2091-02-28', '2091-03-01', '2091-05-15', '2091-08-31', '2091-09-01'];

describe('getFinanceEntries', () => {
  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.financeEntry.deleteMany({ where: { date: { in: DATES.map((d) => new Date(d)) } } });
  });

  test('returns entries from the first day of fromMonth through the last day of toMonth, newest first', async () => {
    for (const date of DATES) {
      await prisma.financeEntry.create({ data: { type: 'EXPENSE', amount: 1000, category: 'Other', date: new Date(date) } });
    }
    const result = await getFinanceEntries('2091-03', '2091-08');
    expect(result.map((e) => e.date)).toEqual(['2091-08-31', '2091-05-15', '2091-03-01']);
    expect(result[0]).toMatchObject({ type: 'EXPENSE', amount: 1000, category: 'Other', note: '' });
  });
});
```

Create `app/(app)/finance/actions.integration.test.ts`:

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
import { createFinanceEntry, deleteFinanceEntry, type CreateFinanceEntryInput } from './actions';

const valid: CreateFinanceEntryInput = { type: 'EXPENSE', amount: 125050, category: 'Groceries', note: '  Weekly shop ', date: '2091-04-10' };

describe('finance actions', () => {
  const created: string[] = [];

  beforeAll(async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
  });

  afterEach(async () => {
    await prisma.financeEntry.deleteMany({ where: { id: { in: created.splice(0) } } });
    vi.mocked(revalidatePath).mockClear();
  });

  test('createFinanceEntry stores the entry with a trimmed note and revalidates /finance', async () => {
    const entry = await createFinanceEntry(valid);
    created.push(entry.id);
    expect(entry).toEqual({ id: entry.id, type: 'EXPENSE', amount: 125050, category: 'Groceries', note: 'Weekly shop', date: '2091-04-10' });
    expect(await prisma.financeEntry.findUnique({ where: { id: entry.id } })).not.toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith('/finance');
  });

  test('createFinanceEntry accepts an income category for income', async () => {
    const entry = await createFinanceEntry({ ...valid, type: 'INCOME', category: 'Salary' });
    created.push(entry.id);
    expect(entry.type).toBe('INCOME');
  });

  test.each([
    ['a zero amount', { amount: 0 }, 'Invalid amount'],
    ['a fractional amount', { amount: 10.5 }, 'Invalid amount'],
    ['an amount over the max', { amount: 2147483648 }, 'Invalid amount'],
    ['a category from the other type', { category: 'Salary' }, 'Invalid category'],
    ['an unknown type', { type: 'GIFT' as never }, 'Invalid entry type'],
    ['a malformed date', { date: '10/04/2091' }, 'Invalid date'],
    ['an impossible date', { date: '2091-02-30' }, 'Invalid date'],
  ])('createFinanceEntry rejects %s', async (_label, patch, message) => {
    await expect(createFinanceEntry({ ...valid, ...patch })).rejects.toThrow(message);
  });

  test('deleteFinanceEntry removes the row', async () => {
    const entry = await createFinanceEntry(valid);
    await deleteFinanceEntry(entry.id);
    expect(await prisma.financeEntry.findUnique({ where: { id: entry.id } })).toBeNull();
  });
});
```

- [ ] **Step 4: Run them to verify they fail**

Run: `npx vitest run "app/(app)/finance/queries.integration.test.ts" "app/(app)/finance/actions.integration.test.ts"`
Expected: FAIL — modules not found.

- [ ] **Step 5: Implement queries and actions**

Create `app/(app)/finance/queries.ts`:

```ts
import 'server-only';
import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { addMonthKey } from '@/app/lib/finance';
import { serializeFinanceEntry, type FinanceEntryDTO } from '@/app/lib/finance-dto';

export type { FinanceEntryDTO };

/** Entries dated fromMonth-01 up to (not including) the month after toMonth, newest first. */
export async function getFinanceEntries(fromMonth: string, toMonth: string): Promise<FinanceEntryDTO[]> {
  await verifySession();
  const entries = await prisma.financeEntry.findMany({
    where: { date: { gte: new Date(`${fromMonth}-01`), lt: new Date(`${addMonthKey(toMonth, 1)}-01`) } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
  return entries.map(serializeFinanceEntry);
}
```

Create `app/(app)/finance/actions.ts`:

```ts
'use server';

import { prisma } from '@/app/lib/prisma';
import { verifySession } from '@/app/lib/dal';
import { revalidatePath } from 'next/cache';
import { categoriesFor, MAX_AMOUNT, type EntryKind } from '@/app/lib/finance';
import { serializeFinanceEntry, type FinanceEntryDTO } from '@/app/lib/finance-dto';

export interface CreateFinanceEntryInput {
  type: EntryKind;
  /** Centimes. */
  amount: number;
  category: string;
  note: string;
  /** 'YYYY-MM-DD' */
  date: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(key: string): boolean {
  if (!DATE_RE.test(key)) return false;
  const date = new Date(key);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
}

export async function createFinanceEntry(input: CreateFinanceEntryInput): Promise<FinanceEntryDTO> {
  await verifySession();
  if (input.type !== 'EXPENSE' && input.type !== 'INCOME') throw new Error('Invalid entry type');
  if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > MAX_AMOUNT) throw new Error('Invalid amount');
  if (!categoriesFor(input.type).includes(input.category)) throw new Error('Invalid category');
  if (!isRealDate(input.date)) throw new Error('Invalid date');
  const entry = await prisma.financeEntry.create({
    data: {
      type: input.type,
      amount: input.amount,
      category: input.category,
      note: input.note.trim(),
      date: new Date(input.date),
    },
  });
  revalidatePath('/finance');
  return serializeFinanceEntry(entry);
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  await verifySession();
  await prisma.financeEntry.delete({ where: { id } });
  revalidatePath('/finance');
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run "app/(app)/finance/queries.integration.test.ts" "app/(app)/finance/actions.integration.test.ts"`
Expected: PASS

Run: `npx tsc --noEmit` — Expected: no errors (Prisma's `EntryType` values are assignable to `EntryKind`).

- [ ] **Step 7: Commit**

```bash
git add prisma app/lib/finance-dto.ts "app/(app)/finance"
git commit -m "feat: add FinanceEntry model with finance queries and server actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 9: Finance view helpers — totals, breakdown, 6-month chart, day groups

**Files:**
- Create: `app/(app)/finance/finance-views.ts`
- Test: `app/(app)/finance/finance-views.test.ts`

**Interfaces:**
- Consumes: `FinanceEntryDTO`; `addMonthKey`, `monthShortLabel`, `categoryColor` (Task 7); `calendarDateLabel` from `app/lib/calendar-dates.ts`
- Produces:
  - `entriesInMonth(entries: FinanceEntryDTO[], month: string): FinanceEntryDTO[]`
  - `interface MonthTotals { earned: number; spent: number; net: number }`, `monthTotals(entries, month): MonthTotals`
  - `interface CategoryRow { name: string; amount: number; percent: number; width: number; color: string }`, `categoryBreakdown(entries, month): CategoryRow[]`
  - `interface ChartMonth { month: string; label: string; earned: number; spent: number }`, `lastSixMonths(entries, month): ChartMonth[]`
  - `interface DayGroup { date: string; label: string; total: number; entries: FinanceEntryDTO[] }`, `groupByDay(entries, month, todayKey: string): DayGroup[]`

- [ ] **Step 1: Write the failing test**

Create `app/(app)/finance/finance-views.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { entriesInMonth, monthTotals, categoryBreakdown, lastSixMonths, groupByDay } from './finance-views';
import type { FinanceEntryDTO } from '@/app/lib/finance-dto';

let seq = 0;
function entry(date: string, type: 'EXPENSE' | 'INCOME', amount: number, category = type === 'INCOME' ? 'Salary' : 'Groceries'): FinanceEntryDTO {
  seq += 1;
  return { id: `e${seq}`, type, amount, category, note: '', date };
}

const entries = [
  entry('2026-09-22', 'EXPENSE', 3000, 'Dining'),
  entry('2026-09-22', 'INCOME', 100000),
  entry('2026-09-05', 'EXPENSE', 9000, 'Groceries'),
  entry('2026-09-01', 'EXPENSE', 1000, 'Dining'),
  entry('2026-08-30', 'EXPENSE', 50000, 'Housing'),
  entry('2026-04-02', 'INCOME', 20000),
];

describe('entriesInMonth / monthTotals', () => {
  test('filters by month prefix', () => {
    expect(entriesInMonth(entries, '2026-09')).toHaveLength(4);
    expect(entriesInMonth(entries, '2026-10')).toHaveLength(0);
  });

  test('sums earned, spent and net', () => {
    expect(monthTotals(entries, '2026-09')).toEqual({ earned: 100000, spent: 13000, net: 87000 });
    expect(monthTotals(entries, '2026-08')).toEqual({ earned: 0, spent: 50000, net: -50000 });
  });
});

describe('categoryBreakdown', () => {
  test('expense categories by amount, with percent of spend and bar width relative to the largest', () => {
    expect(categoryBreakdown(entries, '2026-09')).toEqual([
      { name: 'Groceries', amount: 9000, percent: 69, width: 100, color: 'var(--moss-500)' },
      { name: 'Dining', amount: 4000, percent: 31, width: (4000 / 9000) * 100, color: 'var(--amber-500)' },
    ]);
  });

  test('bars are at least 2% wide, and a month without spending is empty', () => {
    const rows = categoryBreakdown([entry('2026-07-01', 'EXPENSE', 100000, 'Housing'), entry('2026-07-02', 'EXPENSE', 1, 'Fun')], '2026-07');
    expect(rows[1].width).toBe(2);
    expect(categoryBreakdown(entries, '2026-04')).toEqual([]);
  });
});

describe('lastSixMonths', () => {
  test('six months oldest first, ending at the given month', () => {
    const months = lastSixMonths(entries, '2026-09');
    expect(months.map((m) => m.month)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
    expect(months[0]).toEqual({ month: '2026-04', label: 'Apr', earned: 20000, spent: 0 });
    expect(months[5]).toEqual({ month: '2026-09', label: 'Sep', earned: 100000, spent: 13000 });
  });
});

describe('groupByDay', () => {
  test('days newest first with labels and signed totals, keeping entry order within a day', () => {
    const groups = groupByDay(entries, '2026-09', '2026-09-23');
    expect(groups.map((g) => g.date)).toEqual(['2026-09-22', '2026-09-05', '2026-09-01']);
    expect(groups[0].label).toBe('Yesterday');
    expect(groups[1].label).toBe('Sat, Sep 5');
    expect(groups[0].total).toBe(97000);
    expect(groups[2].total).toBe(-1000);
    expect(groups[0].entries.map((e) => e.type)).toEqual(['EXPENSE', 'INCOME']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "app/(app)/finance/finance-views.test.ts"`
Expected: FAIL — cannot resolve `./finance-views`.

- [ ] **Step 3: Implement**

Create `app/(app)/finance/finance-views.ts`:

```ts
import type { FinanceEntryDTO } from '@/app/lib/finance-dto';
import { addMonthKey, monthShortLabel, categoryColor } from '@/app/lib/finance';
import { calendarDateLabel } from '@/app/lib/calendar-dates';

export function entriesInMonth(entries: FinanceEntryDTO[], month: string): FinanceEntryDTO[] {
  return entries.filter((e) => e.date.startsWith(`${month}-`));
}

function signedAmount(e: FinanceEntryDTO): number {
  return e.type === 'INCOME' ? e.amount : -e.amount;
}

export interface MonthTotals {
  earned: number;
  spent: number;
  net: number;
}

export function monthTotals(entries: FinanceEntryDTO[], month: string): MonthTotals {
  let earned = 0;
  let spent = 0;
  for (const e of entriesInMonth(entries, month)) {
    if (e.type === 'INCOME') earned += e.amount;
    else spent += e.amount;
  }
  return { earned, spent, net: earned - spent };
}

export interface CategoryRow {
  name: string;
  amount: number;
  /** Share of the month's spending, rounded to a whole percent. */
  percent: number;
  /** Bar width in % of the largest category, at least 2. */
  width: number;
  color: string;
}

export function categoryBreakdown(entries: FinanceEntryDTO[], month: string): CategoryRow[] {
  const byCategory = new Map<string, number>();
  for (const e of entriesInMonth(entries, month)) {
    if (e.type === 'EXPENSE') byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const sorted = [...byCategory].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, amount]) => sum + amount, 0);
  const largest = sorted[0]?.[1] ?? 1;
  return sorted.map(([name, amount]) => ({
    name,
    amount,
    percent: Math.round((amount / total) * 100),
    width: Math.max(2, (amount / largest) * 100),
    color: categoryColor(name),
  }));
}

export interface ChartMonth {
  month: string;
  label: string;
  earned: number;
  spent: number;
}

export function lastSixMonths(entries: FinanceEntryDTO[], month: string): ChartMonth[] {
  return [5, 4, 3, 2, 1, 0].map((back) => {
    const m = addMonthKey(month, -back);
    const { earned, spent } = monthTotals(entries, m);
    return { month: m, label: monthShortLabel(m), earned, spent };
  });
}

export interface DayGroup {
  date: string;
  label: string;
  /** Signed centimes: income minus spending. */
  total: number;
  entries: FinanceEntryDTO[];
}

export function groupByDay(entries: FinanceEntryDTO[], month: string, todayKey: string): DayGroup[] {
  const byDate = new Map<string, FinanceEntryDTO[]>();
  for (const e of entriesInMonth(entries, month)) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  return [...byDate.keys()]
    .sort()
    .reverse()
    .map((date) => {
      const list = byDate.get(date)!;
      return {
        date,
        label: calendarDateLabel(date, todayKey),
        total: list.reduce((sum, e) => sum + signedAmount(e), 0),
        entries: list,
      };
    });
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run "app/(app)/finance/finance-views.test.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/finance/finance-views.ts" "app/(app)/finance/finance-views.test.ts"
git commit -m "feat: add finance totals, category breakdown, 6-month and day-group helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 10: Finance display components — month switcher, totals, breakdown, chart

**Files:**
- Create: `app/(app)/finance/month-switcher.tsx`, `app/(app)/finance/finance-totals.tsx`, `app/(app)/finance/category-breakdown.tsx`, `app/(app)/finance/month-chart.tsx`
- Test: `app/(app)/finance/finance-display.test.tsx`

**Interfaces:**
- Consumes: `MonthTotals`, `CategoryRow`, `ChartMonth` (Task 9); `formatMoney` (Task 7)
- Produces:
  - `MonthSwitcher({ label, onPrev, onNext, prevDisabled, nextDisabled }: { label: string; onPrev: () => void; onNext: () => void; prevDisabled?: boolean; nextDisabled?: boolean })`
  - `FinanceTotals({ totals }: { totals: MonthTotals })`
  - `CategoryBreakdown({ rows }: { rows: CategoryRow[] })`
  - `MonthChart({ months, selected, onSelect }: { months: ChartMonth[]; selected: string; onSelect: (month: string) => void })`

- [ ] **Step 1: Write the failing test**

Create `app/(app)/finance/finance-display.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { MonthSwitcher } from './month-switcher';
import { FinanceTotals } from './finance-totals';
import { CategoryBreakdown } from './category-breakdown';
import { MonthChart } from './month-chart';

const plain = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

describe('MonthSwitcher', () => {
  test('shows the label and calls prev/next; disabled at the range edges', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<MonthSwitcher label="September 2026" onPrev={onPrev} onNext={onNext} nextDisabled />);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onPrev).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });
});

describe('FinanceTotals', () => {
  test('shows earned, spent and signed net; marks a negative net', () => {
    render(<FinanceTotals totals={{ earned: 100000, spent: 150000, net: -50000 }} />);
    expect(plain(screen.getByTestId('fin-earned').textContent)).toBe('1 000 DA');
    expect(plain(screen.getByTestId('fin-spent').textContent)).toBe('1 500 DA');
    const net = screen.getByTestId('fin-net');
    expect(plain(net.textContent)).toBe('−500 DA');
    expect(net).toHaveAttribute('data-negative');
  });
});

describe('CategoryBreakdown', () => {
  test('renders a row per category, or the empty message', () => {
    const { rerender } = render(
      <CategoryBreakdown rows={[{ name: 'Groceries', amount: 9000, percent: 69, width: 100, color: 'var(--moss-500)' }]} />
    );
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('69%')).toBeInTheDocument();
    expect(plain(screen.getByText(/90/).textContent)).toBe('90 DA');
    rerender(<CategoryBreakdown rows={[]} />);
    expect(screen.getByText('No spending logged.')).toBeInTheDocument();
  });
});

describe('MonthChart', () => {
  const months = [
    { month: '2026-08', label: 'Aug', earned: 0, spent: 5000 },
    { month: '2026-09', label: 'Sep', earned: 10000, spent: 2500 },
  ];

  test('one button per month; the selected one is marked and clicking selects', () => {
    const onSelect = vi.fn();
    render(<MonthChart months={months} selected="2026-09" onSelect={onSelect} />);
    const sep = screen.getByRole('button', { name: /^Sep/ });
    expect(sep).toHaveAttribute('data-selected');
    expect(screen.getByRole('button', { name: /^Aug/ })).not.toHaveAttribute('data-selected');
    fireEvent.click(screen.getByRole('button', { name: /^Aug/ }));
    expect(onSelect).toHaveBeenCalledWith('2026-08');
  });

  test('bars scale to the largest value (132px), with a 2px minimum', () => {
    render(<MonthChart months={months} selected="2026-09" onSelect={vi.fn()} />);
    const bars = screen.getByRole('button', { name: /^Sep/ }).querySelectorAll('.pw-fin-chart-bars > span');
    expect(bars[0]).toHaveStyle({ height: '132px' });
    expect(bars[1]).toHaveStyle({ height: '33px' });
    const augBars = screen.getByRole('button', { name: /^Aug/ }).querySelectorAll('.pw-fin-chart-bars > span');
    expect(augBars[0]).toHaveStyle({ height: '2px' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "app/(app)/finance/finance-display.test.tsx"`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the four components**

Create `app/(app)/finance/month-switcher.tsx`:

```tsx
'use client';

import { Icon } from '@/app/components/icons';
import { IconButton } from '@/app/components/ui/icon-button';

export interface MonthSwitcherProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}

export function MonthSwitcher({ label, onPrev, onNext, prevDisabled, nextDisabled }: MonthSwitcherProps) {
  return (
    <div className="pw-fin-switcher">
      <IconButton label="Previous month" onClick={onPrev} disabled={prevDisabled}>
        <Icon name="left" size={16} />
      </IconButton>
      <span className="pw-fin-switcher-label">{label}</span>
      <IconButton label="Next month" onClick={onNext} disabled={nextDisabled}>
        <Icon name="right" size={16} />
      </IconButton>
    </div>
  );
}
```

Create `app/(app)/finance/finance-totals.tsx`:

```tsx
import { formatMoney } from '@/app/lib/finance';
import type { MonthTotals } from './finance-views';

export function FinanceTotals({ totals }: { totals: MonthTotals }) {
  return (
    <div className="pw-fin-totals">
      <div className="pw-stat">
        <span className="st-label">Earned</span>
        <span className="pw-fin-total" data-testid="fin-earned">{formatMoney(totals.earned)}</span>
      </div>
      <div className="pw-stat">
        <span className="st-label">Spent</span>
        <span className="pw-fin-total" data-testid="fin-spent">{formatMoney(totals.spent)}</span>
      </div>
      <div className="pw-stat">
        <span className="st-label">Net</span>
        <span className="pw-fin-total" data-testid="fin-net" data-negative={totals.net < 0 || undefined}>
          {formatMoney(totals.net, { signed: true })}
        </span>
      </div>
    </div>
  );
}
```

Create `app/(app)/finance/category-breakdown.tsx`:

```tsx
import { formatMoney } from '@/app/lib/finance';
import type { CategoryRow } from './finance-views';

export function CategoryBreakdown({ rows }: { rows: CategoryRow[] }) {
  return (
    <section className="pw-fin-section">
      <h2 className="st-label">Spending by category</h2>
      {rows.length === 0 ? (
        <p className="st-empty">No spending logged.</p>
      ) : (
        rows.map((row) => (
          <div key={row.name} className="pw-fin-cat">
            <div className="pw-fin-cat-head">
              <span className="pw-fin-dot" style={{ background: row.color }} />
              <span style={{ flex: 1 }}>{row.name}</span>
              <span className="pw-fin-cat-pct">{row.percent}%</span>
              <span className="pw-fin-cat-amt">{formatMoney(row.amount)}</span>
            </div>
            <div className="pw-fin-bar">
              <div style={{ width: `${row.width}%`, background: row.color }} />
            </div>
          </div>
        ))
      )}
    </section>
  );
}
```

Create `app/(app)/finance/month-chart.tsx`:

```tsx
'use client';

import { formatMoney } from '@/app/lib/finance';
import type { ChartMonth } from './finance-views';

const BAR_MAX = 132;

export interface MonthChartProps {
  months: ChartMonth[];
  selected: string;
  onSelect: (month: string) => void;
}

export function MonthChart({ months, selected, onSelect }: MonthChartProps) {
  const largest = Math.max(1, ...months.flatMap((m) => [m.earned, m.spent]));
  const height = (value: number) => Math.max(2, Math.round((value / largest) * BAR_MAX));

  return (
    <section className="pw-fin-section">
      <div className="pw-fin-chart-head">
        <h2 className="st-label">Last 6 months</h2>
        <div className="pw-fin-legend">
          <span><i style={{ background: 'var(--accent)' }} />Earned</span>
          <span><i style={{ background: 'var(--border-strong)' }} />Spent</span>
        </div>
      </div>
      <div className="pw-fin-chart">
        {months.map((m) => {
          const title = `${m.label} — earned ${formatMoney(m.earned)}, spent ${formatMoney(m.spent)}`;
          return (
            <button
              key={m.month}
              type="button"
              className="pw-fin-chart-col"
              data-selected={m.month === selected || undefined}
              title={title}
              aria-label={title}
              onClick={() => onSelect(m.month)}
            >
              <span className="pw-fin-chart-bars">
                <span style={{ height: height(m.earned), background: 'var(--accent)' }} />
                <span style={{ height: height(m.spent), background: 'var(--border-strong)' }} />
              </span>
              <span className="pw-fin-chart-label">{m.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run "app/(app)/finance/finance-display.test.tsx"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/finance/month-switcher.tsx" "app/(app)/finance/finance-totals.tsx" "app/(app)/finance/category-breakdown.tsx" "app/(app)/finance/month-chart.tsx" "app/(app)/finance/finance-display.test.tsx"
git commit -m "feat: add finance month switcher, totals, category breakdown and 6-month chart

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 11: Finance entry form and entry list

**Files:**
- Create: `app/(app)/finance/entry-form.tsx`, `app/(app)/finance/entry-list.tsx`
- Test: `app/(app)/finance/entry-form.test.tsx`, `app/(app)/finance/entry-list.test.tsx`

**Interfaces:**
- Consumes: `categoriesFor`, `defaultCategory`, `parseAmount`, `formatMoney`, `categoryColor`, `EntryKind` (Task 7); `DayGroup` (Task 9); `CreateFinanceEntryInput` type (Task 8); `PillToggle`, `Input`, `Select`, `IconButton`
- Produces:
  - `EntryForm({ defaultDate, onSubmit }: { defaultDate: string; onSubmit: (input: CreateFinanceEntryInput) => Promise<boolean> })` — clears amount and note only when `onSubmit` resolves `true`
  - `EntryList({ groups, count, onDelete }: { groups: DayGroup[]; count: number; onDelete: (id: string) => void })`

- [ ] **Step 1: Write the failing tests**

Create `app/(app)/finance/entry-form.test.tsx`:

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { EntryForm } from './entry-form';

function setup(result = true) {
  const onSubmit = vi.fn().mockResolvedValue(result);
  render(<EntryForm defaultDate="2026-09-26" onSubmit={onSubmit} />);
  return onSubmit;
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Log entry' }));
  });
}

describe('EntryForm', () => {
  test('defaults to an expense in Groceries dated today', () => {
    setup();
    expect(screen.getByRole('tab', { name: 'Expense' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Category')).toHaveValue('Groceries');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-09-26');
  });

  test('switching to income swaps the categories and resets to Salary', () => {
    setup();
    fireEvent.click(screen.getByRole('tab', { name: 'Income' }));
    const category = screen.getByLabelText('Category');
    expect(category).toHaveValue('Salary');
    expect(screen.getByRole('option', { name: 'Freelance' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Groceries' })).not.toBeInTheDocument();
  });

  test('submits centimes, trimmed note and the chosen fields, then clears amount and note', async () => {
    const onSubmit = setup();
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1250,50' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Dining' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: '  Pizza ' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-20' } });
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ type: 'EXPENSE', amount: 125050, category: 'Dining', note: 'Pizza', date: '2026-09-20' });
    expect(screen.getByLabelText('Amount')).toHaveValue('');
    expect(screen.getByLabelText('Note')).toHaveValue('');
    expect(screen.getByLabelText('Category')).toHaveValue('Dining');
  });

  test('an invalid amount does not submit and focuses the amount', async () => {
    const onSubmit = setup();
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0' } });
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Amount')).toHaveFocus();
  });

  test('keeps the fields when the submit fails', async () => {
    setup(false);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    await submit();
    expect(screen.getByLabelText('Amount')).toHaveValue('10');
  });
});
```

Create `app/(app)/finance/entry-list.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { EntryList } from './entry-list';
import type { DayGroup } from './finance-views';

const plain = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

const groups: DayGroup[] = [
  {
    date: '2026-09-22',
    label: 'Yesterday',
    total: 97000,
    entries: [
      { id: 'a', type: 'EXPENSE', amount: 3000, category: 'Dining', note: 'Ramen', date: '2026-09-22' },
      { id: 'b', type: 'INCOME', amount: 100000, category: 'Salary', note: '', date: '2026-09-22' },
    ],
  },
];

describe('EntryList', () => {
  test('shows the count, day label and signed total, and each entry', () => {
    render(<EntryList groups={groups} count={2} onDelete={vi.fn()} />);
    expect(screen.getByText('Entries')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(plain(screen.getByTestId('day-total-2026-09-22').textContent)).toBe('+970 DA');
    expect(screen.getByText('Ramen')).toBeInTheDocument();
    expect(plain(screen.getByTestId('amount-a').textContent)).toBe('−30 DA');
    const income = screen.getByTestId('amount-b');
    expect(plain(income.textContent)).toBe('+1 000 DA');
    expect(income).toHaveAttribute('data-income');
  });

  test('remove calls onDelete with the id', () => {
    const onDelete = vi.fn();
    render(<EntryList groups={groups} count={2} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Dining entry' }));
    expect(onDelete).toHaveBeenCalledWith('a');
  });

  test('empty month message', () => {
    render(<EntryList groups={[]} count={0} onDelete={vi.fn()} />);
    expect(screen.getByText('Nothing logged this month.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run "app/(app)/finance/entry-form.test.tsx" "app/(app)/finance/entry-list.test.tsx"`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the form**

Create `app/(app)/finance/entry-form.tsx`:

```tsx
'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Icon } from '@/app/components/icons';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { IconButton } from '@/app/components/ui/icon-button';
import { PillToggle } from '@/app/components/ui/pill-toggle';
import { categoriesFor, defaultCategory, parseAmount, type EntryKind } from '@/app/lib/finance';
import type { CreateFinanceEntryInput } from './actions';

const TYPE_OPTIONS = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
] as const;

export interface EntryFormProps {
  defaultDate: string;
  /** Resolves true when the entry was saved; amount and note clear only then. */
  onSubmit: (input: CreateFinanceEntryInput) => Promise<boolean>;
}

export function EntryForm({ defaultDate, onSubmit }: EntryFormProps) {
  const [type, setType] = useState<EntryKind>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(defaultCategory('EXPENSE'));
  const [note, setNote] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  function changeType(next: EntryKind) {
    setType(next);
    setCategory(defaultCategory(next));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const centimes = parseAmount(amount);
    if (centimes === null || !date) {
      amountRef.current?.focus();
      return;
    }
    setBusy(true);
    const ok = await onSubmit({ type, amount: centimes, category, note: note.trim(), date });
    setBusy(false);
    if (ok) {
      setAmount('');
      setNote('');
    }
  }

  return (
    <form className="pw-fin-form" onSubmit={handleSubmit} aria-label="New entry">
      <div style={{ alignSelf: 'flex-start' }}>
        <PillToggle ariaLabel="Entry type" options={TYPE_OPTIONS} value={type} onChange={changeType} />
      </div>
      <div className="pw-fin-entry">
        <Input
          ref={amountRef}
          aria-label="Amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Select
          aria-label="Category"
          options={categoriesFor(type).map((c) => ({ value: c, label: c }))}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <div className="pw-fin-entry-note">
          <Input aria-label="Note" placeholder="What for?" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Input aria-label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <IconButton type="submit" label="Log entry" variant="primary" disabled={busy}>
          <Icon name="plus" size={16} />
        </IconButton>
      </div>
    </form>
  );
}
```

`PillToggle`'s generic `T` infers as `'EXPENSE' | 'INCOME'` from `TYPE_OPTIONS`, so `changeType` type-checks.

- [ ] **Step 4: Implement the list**

Create `app/(app)/finance/entry-list.tsx`:

```tsx
'use client';

import { Icon } from '@/app/components/icons';
import { IconButton } from '@/app/components/ui/icon-button';
import { formatMoney, categoryColor } from '@/app/lib/finance';
import type { DayGroup } from './finance-views';

export interface EntryListProps {
  groups: DayGroup[];
  count: number;
  onDelete: (id: string) => void;
}

export function EntryList({ groups, count, onDelete }: EntryListProps) {
  return (
    <section className="pw-fin-section" style={{ gap: 4 }}>
      <h2 className="st-label">
        Entries<span className="st-label-count">{count}</span>
      </h2>
      {groups.length === 0 ? (
        <p className="st-empty">Nothing logged this month.</p>
      ) : (
        groups.map((group) => (
          <div key={group.date}>
            <div className="pw-fin-dayhead">
              <span>{group.label}</span>
              <span className="pw-fin-mono" data-testid={`day-total-${group.date}`}>
                {formatMoney(group.total, { signed: true })}
              </span>
            </div>
            {group.entries.map((entry) => {
              const income = entry.type === 'INCOME';
              return (
                <div key={entry.id} className="pw-fin-row">
                  <span className="pw-fin-dot" style={{ background: categoryColor(entry.category) }} />
                  <span className="pw-fin-row-text">
                    {entry.category}
                    {entry.note && <span className="pw-fin-row-note">{entry.note}</span>}
                  </span>
                  <span className="pw-fin-row-amt" data-testid={`amount-${entry.id}`} data-income={income || undefined}>
                    {formatMoney(income ? entry.amount : -entry.amount, { signed: true })}
                  </span>
                  <IconButton label={`Remove ${entry.category} entry`} size="sm" onClick={() => onDelete(entry.id)}>
                    <Icon name="x" size={15} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        ))
      )}
    </section>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run "app/(app)/finance/entry-form.test.tsx" "app/(app)/finance/entry-list.test.tsx"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/finance/entry-form.tsx" "app/(app)/finance/entry-form.test.tsx" "app/(app)/finance/entry-list.tsx" "app/(app)/finance/entry-list.test.tsx"
git commit -m "feat: add finance entry form and day-grouped entry list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 12: FinanceBoard, `/finance` page, nav item and CSS

**Files:**
- Create: `app/(app)/finance/finance-board.tsx`, `app/(app)/finance/page.tsx`
- Test: `app/(app)/finance/finance-board.test.tsx`
- Modify: `app/components/shell/nav-items.ts`, `app/styles/layout.css`

**Interfaces:**
- Consumes: Tasks 7–11; `todayKey` from `app/lib/date-format.ts`; `MIN_MONTH_INDEX`, `MAX_MONTH_INDEX` from `app/lib/calendar-units.ts`; `useRouter` from `next/navigation`
- Produces: `FinanceBoard({ month, entries }: { month: string; entries: FinanceEntryDTO[] })`; route `/finance?month=YYYY-MM`; nav item `{ key: 'finance', label: 'Finance', href: '/finance', icon: 'wallet' }`

- [ ] **Step 1: Write the failing board test**

Create `app/(app)/finance/finance-board.test.tsx`:

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { FinanceBoard } from './finance-board';
import * as actions from './actions';
import type { FinanceEntryDTO } from '@/app/lib/finance-dto';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('./actions', () => ({ createFinanceEntry: vi.fn(), deleteFinanceEntry: vi.fn() }));

const plain = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

const entries: FinanceEntryDTO[] = [
  { id: 'a', type: 'EXPENSE', amount: 3000, category: 'Dining', note: 'Ramen', date: '2026-09-22' },
  { id: 'b', type: 'INCOME', amount: 100000, category: 'Salary', note: '', date: '2026-09-01' },
  { id: 'c', type: 'EXPENSE', amount: 50000, category: 'Housing', note: '', date: '2026-08-01' },
];

describe('FinanceBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-26T12:00:00'));
    window.alert = vi.fn();
    vi.mocked(actions.deleteFinanceEntry).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows the month label and only that month\'s totals and entries', () => {
    render(<FinanceBoard month="2026-09" entries={entries} />);
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(plain(screen.getByTestId('fin-earned').textContent)).toBe('1 000 DA');
    expect(plain(screen.getByTestId('fin-spent').textContent)).toBe('30 DA');
    expect(screen.getByText('Ramen')).toBeInTheDocument();
    expect(screen.queryByText('Housing', { selector: '.pw-fin-row-text' })).not.toBeInTheDocument();
  });

  test('arrows and chart months navigate via ?month=', () => {
    render(<FinanceBoard month="2026-09" entries={entries} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(push).toHaveBeenLastCalledWith('/finance?month=2026-08');
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(push).toHaveBeenLastCalledWith('/finance?month=2026-10');
    fireEvent.click(screen.getByRole('button', { name: /^Jul/ }));
    expect(push).toHaveBeenLastCalledWith('/finance?month=2026-07');
  });

  test('the next arrow is disabled at 2100-12', () => {
    render(<FinanceBoard month="2100-12" entries={[]} />);
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  test('logging an entry in the viewed month adds it to the list', async () => {
    vi.mocked(actions.createFinanceEntry).mockResolvedValue({ id: 'n', type: 'EXPENSE', amount: 1500, category: 'Groceries', note: 'Bread', date: '2026-09-26' });
    render(<FinanceBoard month="2026-09" entries={entries} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Bread' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Log entry' }));
    });
    expect(actions.createFinanceEntry).toHaveBeenCalledWith({ type: 'EXPENSE', amount: 1500, category: 'Groceries', note: 'Bread', date: '2026-09-26' });
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  test('logging an entry in another month navigates there', async () => {
    vi.mocked(actions.createFinanceEntry).mockResolvedValue({ id: 'n', type: 'EXPENSE', amount: 1500, category: 'Groceries', note: '', date: '2026-06-10' });
    render(<FinanceBoard month="2026-09" entries={entries} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-06-10' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Log entry' }));
    });
    expect(push).toHaveBeenCalledWith('/finance?month=2026-06');
  });

  test('a failed create alerts', async () => {
    vi.mocked(actions.createFinanceEntry).mockRejectedValue(new Error('boom'));
    render(<FinanceBoard month="2026-09" entries={entries} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Log entry' }));
    });
    expect(window.alert).toHaveBeenCalled();
    expect(screen.getByLabelText('Amount')).toHaveValue('15');
  });

  test('remove is optimistic and rolls back on failure', async () => {
    render(<FinanceBoard month="2026-09" entries={entries} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove Dining entry' }));
    });
    expect(actions.deleteFinanceEntry).toHaveBeenCalledWith('a');
    expect(screen.queryByText('Ramen')).not.toBeInTheDocument();

    vi.mocked(actions.deleteFinanceEntry).mockRejectedValue(new Error('boom'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove Salary entry' }));
    });
    expect(window.alert).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remove Salary entry' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "app/(app)/finance/finance-board.test.tsx"`
Expected: FAIL — cannot resolve `./finance-board`.

- [ ] **Step 3: Implement the board**

Create `app/(app)/finance/finance-board.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/shell/page-header';
import { todayKey as getTodayKey } from '@/app/lib/date-format';
import { MIN_MONTH_INDEX, MAX_MONTH_INDEX } from '@/app/lib/calendar-units';
import { addMonthKey, monthKeyLabel, monthIndexOfMonthKey } from '@/app/lib/finance';
import type { FinanceEntryDTO } from '@/app/lib/finance-dto';
import { createFinanceEntry, deleteFinanceEntry, type CreateFinanceEntryInput } from './actions';
import { monthTotals, categoryBreakdown, lastSixMonths, groupByDay, entriesInMonth } from './finance-views';
import { MonthSwitcher } from './month-switcher';
import { FinanceTotals } from './finance-totals';
import { EntryForm } from './entry-form';
import { CategoryBreakdown } from './category-breakdown';
import { MonthChart } from './month-chart';
import { EntryList } from './entry-list';

export interface FinanceBoardProps {
  /** 'YYYY-MM' being viewed. */
  month: string;
  /** Entries for `month` and the five months before it. */
  entries: FinanceEntryDTO[];
}

// page.tsx renders this with key={month}, so a month change remounts it with fresh entries.
export function FinanceBoard({ month, entries: initialEntries }: FinanceBoardProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const today = getTodayKey();
  const monthIndex = monthIndexOfMonthKey(month);

  function goTo(target: string) {
    router.push(`/finance?month=${target}`);
  }

  async function handleCreate(input: CreateFinanceEntryInput): Promise<boolean> {
    try {
      const entry = await createFinanceEntry(input);
      const entryMonth = entry.date.slice(0, 7);
      if (entryMonth === month) setEntries((prev) => [entry, ...prev]);
      else goTo(entryMonth);
      return true;
    } catch {
      window.alert('Could not log the entry. Please try again.');
      return false;
    }
  }

  async function handleDelete(id: string) {
    const removed = entries.find((e) => e.id === id);
    if (!removed) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteFinanceEntry(id);
    } catch {
      setEntries((prev) => [removed, ...prev]);
      window.alert('Could not remove the entry. Please try again.');
    }
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <PageHeader
        title="Finance"
        actions={
          <MonthSwitcher
            label={monthKeyLabel(month)}
            onPrev={() => goTo(addMonthKey(month, -1))}
            onNext={() => goTo(addMonthKey(month, 1))}
            prevDisabled={monthIndex <= MIN_MONTH_INDEX}
            nextDisabled={monthIndex >= MAX_MONTH_INDEX}
          />
        }
      />
      <div className="pw-finance">
        <FinanceTotals totals={monthTotals(entries, month)} />
        <EntryForm defaultDate={today} onSubmit={handleCreate} />
        <div className="pw-fin-two">
          <CategoryBreakdown rows={categoryBreakdown(entries, month)} />
          <MonthChart months={lastSixMonths(entries, month)} selected={month} onSelect={goTo} />
        </div>
        <EntryList
          groups={groupByDay(entries, month, today)}
          count={entriesInMonth(entries, month).length}
          onDelete={(id) => void handleDelete(id)}
        />
      </div>
    </div>
  );
}
```

Note: a restored entry is prepended, so on rollback it can sit above newer same-day entries until the next load. Acceptable; the day grouping still places it on the right day.

- [ ] **Step 4: Add the page, nav item and CSS**

Create `app/(app)/finance/page.tsx` (Next 16: `searchParams` is a Promise — see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`):

```tsx
import { getFinanceEntries } from './queries';
import { FinanceBoard } from './finance-board';
import { addMonthKey, parseMonthParam } from '@/app/lib/finance';
import { todayKey } from '@/app/lib/date-format';

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { month: raw } = await searchParams;
  const month = parseMonthParam(typeof raw === 'string' ? raw : undefined, todayKey().slice(0, 7));
  const entries = await getFinanceEntries(addMonthKey(month, -5), month);
  return <FinanceBoard key={month} month={month} entries={entries} />;
}
```

In `app/components/shell/nav-items.ts`, add after the `notes` entry:

```ts
  { key: 'finance', label: 'Finance', href: '/finance', icon: 'wallet' },
```

The final list is: dashboard (Today), tasks, calendar, matrix, habits, notes, finance.

Append to `app/styles/layout.css`:

```css
/* ---------- Finance ---------- */
.pw-finance { display: flex; flex-direction: column; gap: 32px; padding: 0 var(--pw-gutter); }
.pw-fin-switcher { display: flex; align-items: center; gap: 4px; }
.pw-fin-switcher-label { min-width: 132px; text-align: center; font-weight: 500; }
.pw-fin-totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; padding: 20px 0; border-top: 1px solid var(--border-1); border-bottom: 1px solid var(--border-1); }
.pw-fin-total { font-family: var(--font-mono); font-size: 24px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pw-fin-total[data-negative] { color: var(--danger-fg); }
.pw-fin-form { display: flex; flex-direction: column; gap: 12px; }
.pw-fin-entry { display: grid; grid-template-columns: 120px 150px minmax(0, 1fr) 150px 34px; gap: 8px; align-items: center; }
.pw-fin-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 40px; }
.pw-fin-section { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.pw-fin-dot { width: 8px; height: 8px; border-radius: 999px; flex: none; }
.pw-fin-cat { display: flex; flex-direction: column; gap: 6px; }
.pw-fin-cat-head { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.pw-fin-cat-pct { font-family: var(--font-mono); color: var(--fg-3); }
.pw-fin-cat-amt { font-family: var(--font-mono); min-width: 96px; text-align: right; white-space: nowrap; }
.pw-fin-bar { height: 4px; border-radius: 999px; background: var(--surface-sunken); overflow: hidden; }
.pw-fin-bar > div { height: 100%; border-radius: 999px; }
.pw-fin-chart-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.pw-fin-legend { display: flex; gap: 12px; font-size: 12px; color: var(--fg-3); }
.pw-fin-legend span { display: flex; align-items: center; gap: 6px; }
.pw-fin-legend i { width: 7px; height: 7px; border-radius: 2px; }
.pw-fin-chart { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; align-items: end; height: 168px; padding-top: 8px; }
.pw-fin-chart-col { appearance: none; border: none; background: transparent; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; font: inherit; }
.pw-fin-chart-bars { display: flex; align-items: flex-end; gap: 3px; height: 132px; }
.pw-fin-chart-bars > span { width: 12px; border-radius: 3px 3px 0 0; opacity: 0.55; transition: height 600ms var(--ease-out); }
.pw-fin-chart-col[data-selected] .pw-fin-chart-bars > span { opacity: 1; }
.pw-fin-chart-label { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); }
.pw-fin-chart-col[data-selected] .pw-fin-chart-label { color: var(--fg-1); font-weight: 600; }
.pw-fin-dayhead { display: flex; justify-content: space-between; gap: 12px; padding: 16px 0 6px; font-size: 13px; color: var(--fg-3); border-bottom: 1px solid var(--border-1); }
.pw-fin-mono { font-family: var(--font-mono); white-space: nowrap; }
.pw-fin-row { display: flex; align-items: center; gap: 12px; min-height: 44px; border-bottom: 1px solid var(--border-1); }
.pw-fin-row-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pw-fin-row-note { color: var(--fg-3); margin-left: 8px; }
.pw-fin-row-amt { flex: none; font-family: var(--font-mono); font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--fg-1); }
.pw-fin-row-amt[data-income] { color: var(--success-fg); }
@media (prefers-reduced-motion: reduce) {
  .pw-fin-chart-bars > span { transition: none; }
}
@media (max-width: 720px) {
  .pw-fin-two { grid-template-columns: minmax(0, 1fr); }
  .pw-fin-entry { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .pw-fin-entry-note { grid-column: 1 / -1; }
  .pw-fin-total { font-size: 18px; }
}
```

On phones the 34px submit button lands alone in the last grid row; that matches the mockup's two-column collapse.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run "app/(app)/finance" app/components/shell`
Expected: PASS (unit + component; the `*.integration.test.ts` files also run here and need the DB).

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run lint` — Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/finance" app/components/shell/nav-items.ts app/styles/layout.css
git commit -m "feat: add the Finance page with monthly totals, category breakdown, 6-month chart and entry log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```

---

### Task 13: Full verification

**Files:** none new (fix-ups only if something fails).

- [ ] **Step 1: Whole test suite**

Run: `npm test`
Expected: all unit/component tests pass.

Run: `npm run test:integration`
Expected: all integration tests pass (including the pre-existing tasks/habits/calendar/matrix ones).

- [ ] **Step 2: Types, lint, production build**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npm run lint` — Expected: no errors.
Run: `npm run build` — Expected: build succeeds; `/notes` and `/finance` appear in the route list; no `/journal`.

- [ ] **Step 3: Manual check in the browser**

Run `npm run dev`, log in, and check:
- Nav shows exactly Today, Tasks, Calendar, Matrix, Habits, Notes, Finance (sidebar at desktop width; bottom nav at ≤860px — all 7 tabs fit at 360px wide without horizontal scroll).
- `/journal` returns 404.
- Notes: create (button and Ctrl+Enter), search, pin (moves to top, time label unchanged), open → edit → wait → reload shows the edit, blank + Done deletes, card delete.
- Finance: log an expense and an income in the current month (totals, breakdown, chart and list update), log one dated in a previous month (navigates there), remove one, arrows and chart clicks change `?month=`, `/finance?month=garbage` shows the current month, amounts read like `1 234,5 DA`.
- Both themes (the saved `daybook_theme` cookie) look right; phone width stacks the finance columns and the entry form.

- [ ] **Step 4: Commit any fix-ups**

If Steps 1–3 required changes, commit them:

```bash
git add -A app prisma
git commit -m "fix: address issues found in Notes/Finance verification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018h5LK6DqnTDvKmeh7zzdVM"
```
