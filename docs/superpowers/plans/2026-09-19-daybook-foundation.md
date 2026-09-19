# Daybook Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the data layer, single-account auth, and the app shell (design-system CSS, shared UI primitives, sidebar/bottom-nav) so that a signed-in user lands on a working (mostly stub) Dashboard, with every later feature phase building on top of this.

**Architecture:** Next.js 16 App Router with Prisma + Postgres for storage and Server Actions for all mutations. Auth is a single hardcoded account: a signed JWT session cookie (via `jose`), verified by a Data Access Layer (`app/lib/dal.ts`) and optimistically checked by `proxy.ts` (Next 16's renamed `middleware.ts`). Visual design is copied byte-for-byte from the Klivr design system's CSS token files; layout/components are rebuilt as real React using the same CSS custom properties and the same hand-written `.pw-*` classes the design mockup already defines.

**Tech Stack:** Next.js 16.3.5, React 19.2, TypeScript, Prisma + PostgreSQL, `jose` (session JWT), `bcryptjs` (password hashing), Vitest + React Testing Library (tests), Tailwind v4 (utility spacing only — the design system CSS variables are the source of truth for color/type/spacing/radius/shadow).

## Global Constraints

- This is a **single-user personal app** — no signup flow, no roles, no `userId` foreign keys anywhere in the schema.
- Next.js 16 renamed `middleware.ts` → `proxy.ts` (same capability, confirmed from `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
- Every Server Action must independently verify the session — it is reachable via direct POST, not just from the UI it's wired to (per `node_modules/next/dist/docs/01-app/02-guides/authentication.md`).
- Design tokens/colors/radii/shadows come verbatim from `Personal productivity webapp/_ds/klivr-design-system-3b321960-77a8-413a-a952-306d16a5c187/`. Do not invent new colors or radii — use the CSS custom properties (`var(--accent)`, `var(--surface)`, `var(--radius-md)`, etc.).
- Responsive breakpoints (exact, from the mockup): **860px** (sidebar ↔ bottom nav), **900px** (matrix/habit split ↔ stacked — later phases), **1100px** (dashboard grid columns — later phases), **560px** (dialog field rows — later phases).
- Import alias `@/*` maps to the repo root (see `tsconfig.json`).
- No placeholders, no TODOs — every task below ships working, tested code.

---

## Task 1: Testing infrastructure (Vitest + React Testing Library)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `test/mocks/server-only.ts`
- Test: `test/smoke.test.ts`

**Interfaces:**
- Produces: a working `npm test` command; a `server-only` alias so files that import the real `server-only` package (which throws when imported outside Next's `react-server` bundling condition) can still be unit tested; `vitest.setup.ts` seeds `SESSION_SECRET`, `AUTH_EMAIL`, `AUTH_PASSWORD_HASH` env vars used by later tasks' tests.

- [ ] **Step 1: Install test dependencies**

Run:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Create the mock for the `server-only` package**

Create `test/mocks/server-only.ts`:
```ts
export {};
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './test/mocks/server-only.ts'),
    },
  },
});
```

- [ ] **Step 4: Create the test setup file**

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import bcrypt from 'bcryptjs';

process.env.SESSION_SECRET ??= 'test-session-secret-please-do-not-use-in-prod';
process.env.AUTH_EMAIL ??= 'owner@example.com';
// Low cost factor (4) keeps the test suite fast; never use this factor in production.
process.env.AUTH_PASSWORD_HASH ??= bcrypt.hashSync('correct-password', 4);
```

- [ ] **Step 5: Write a smoke test**

Create `test/smoke.test.ts`:
```ts
import { describe, test, expect } from 'vitest';

describe('test harness', () => {
  test('runs and sees the seeded env vars', () => {
    expect(process.env.SESSION_SECRET).toBeDefined();
    expect(process.env.AUTH_EMAIL).toBe('owner@example.com');
  });
});
```

- [ ] **Step 6: Add npm scripts**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run --exclude \"**/*.integration.test.ts\"",
"test:watch": "vitest --exclude \"**/*.integration.test.ts\"",
"test:integration": "vitest run \"**/*.integration.test.ts\""
```

- [ ] **Step 7: Run the test suite**

Run: `npm test`
Expected: `test/smoke.test.ts` passes (1 test), no other tests exist yet.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts test/
git commit -m "test: add Vitest + React Testing Library harness"
```

---

## Task 2: Environment variables & credential generation

**Files:**
- Create: `.env.example`
- Create: `scripts/hash-password.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces: documented env vars (`DATABASE_URL`, `SESSION_SECRET`, `AUTH_EMAIL`, `AUTH_PASSWORD_HASH`) that Tasks 3–9 read; a `npm run hash-password -- <password>` command to generate `AUTH_PASSWORD_HASH`.

- [ ] **Step 1: Allow `.env.example` past the blanket `.env*` ignore rule**

In `.gitignore`, change:
```gitignore
# env files (can opt-in for committing if needed)
.env*
```
to:
```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

- [ ] **Step 2: Create `.env.example`**

Create `.env.example`:
```bash
# Postgres connection string (Vercel Postgres, or a local Postgres for development)
DATABASE_URL="postgresql://user:password@localhost:5432/daybook"

# Random 32+ byte secret used to sign session cookies. Generate with:
#   openssl rand -base64 32
SESSION_SECRET=""

# The single account allowed to sign in.
AUTH_EMAIL="you@example.com"
# Generate with: npm run hash-password -- "your-password"
AUTH_PASSWORD_HASH=""
```

- [ ] **Step 3: Create the password-hashing script**

Create `scripts/hash-password.mjs`:
```js
import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- "<password>"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log(hash);
```

- [ ] **Step 4: Add the npm script**

In `package.json`, add to `"scripts"`:
```json
"hash-password": "node scripts/hash-password.mjs"
```

- [ ] **Step 5: Verify it runs**

Run: `npm run hash-password -- "correct-password"`
Expected: prints a string starting with `$2` (a bcrypt hash), no errors.

- [ ] **Step 6: Commit**

```bash
git add .gitignore .env.example scripts/hash-password.mjs package.json
git commit -m "chore: document env vars and add a password-hash generator"
```

---

## Task 3: Prisma schema, client, and migration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `app/lib/prisma.ts`
- Test: `app/lib/prisma.integration.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `prisma` (singleton `PrismaClient` instance) from `@/app/lib/prisma`, and the generated `@prisma/client` types (`TaskList`, `Task`, `Priority`, `FreqType`, `Habit`, `HabitLog`, `Mood`, `JournalEntry`) used by every later phase.
- Requires (dev-only, for the integration test and for running migrations): a reachable Postgres at `DATABASE_URL`. A quick local option: `docker run --name daybook-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=daybook -p 5432:5432 -d postgres:16`, then `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/daybook"`.

- [ ] **Step 1: Install Prisma**

Run:
```bash
npm install prisma @prisma/client
```

- [ ] **Step 2: Write the schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model TaskList {
  id        String   @id @default(cuid())
  name      String
  order     Int
  createdAt DateTime @default(now())
  tasks     Task[]

  @@map("task_lists")
}

enum Priority {
  RED
  AMBER
  BLUE
  GREEN
}

model Task {
  id        String    @id @default(cuid())
  text      String
  list      TaskList  @relation(fields: [listId], references: [id], onDelete: Cascade)
  listId    String
  priority  Priority?
  due       DateTime? @db.Date
  dueTime   Int?
  duration  Int       @default(60)
  done      Boolean   @default(false)
  order     Int
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([listId])
  @@map("tasks")
}

enum FreqType {
  DAILY
  WEEKLY
}

model Habit {
  id           String     @id @default(cuid())
  name         String
  color        String
  freqType     FreqType
  timesPerWeek Int?
  startDate    DateTime   @db.Date
  order        Int
  createdAt    DateTime   @default(now())
  logs         HabitLog[]

  @@map("habits")
}

model HabitLog {
  id      String   @id @default(cuid())
  habit   Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
  habitId String
  date    DateTime @db.Date

  @@unique([habitId, date])
  @@map("habit_logs")
}

enum Mood {
  GREAT
  GOOD
  OKAY
  LOW
  ROUGH
}

model JournalEntry {
  id        String   @id @default(cuid())
  date      DateTime @unique @db.Date
  text      String
  mood      Mood     @default(OKAY)
  updatedAt DateTime @updatedAt

  @@map("journal_entries")
}
```

- [ ] **Step 2: Create the Prisma client singleton**

Create `app/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Add Prisma npm scripts**

In `package.json`, add to `"scripts"`:
```json
"db:migrate": "prisma migrate dev",
"db:generate": "prisma generate"
```

- [ ] **Step 4: Generate the client and run the initial migration**

Requires `DATABASE_URL` set in `.env` (see Task 2's `.env.example` / the Docker command above).

Run: `npm run db:migrate -- --name init`
Expected: creates `prisma/migrations/<timestamp>_init/migration.sql` and applies it; ends with "Your database is now in sync with your schema."

- [ ] **Step 5: Write the integration test**

Create `app/lib/prisma.integration.test.ts`:
```ts
import { describe, test, expect, afterAll } from 'vitest';
import { prisma } from '@/app/lib/prisma';

describe('prisma TaskList/Task', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('creates a list and a task, and cascade-deletes the task when the list is deleted', async () => {
    const list = await prisma.taskList.create({ data: { name: 'Integration test list', order: 0 } });
    const task = await prisma.task.create({
      data: { text: 'Integration test task', listId: list.id, order: 0 },
    });

    const found = await prisma.task.findUnique({ where: { id: task.id } });
    expect(found?.text).toBe('Integration test task');
    expect(found?.priority).toBeNull();
    expect(found?.done).toBe(false);

    await prisma.taskList.delete({ where: { id: list.id } });
    const afterDelete = await prisma.task.findUnique({ where: { id: task.id } });
    expect(afterDelete).toBeNull();
  });

  test('enforces one HabitLog per habit per date', async () => {
    const habit = await prisma.habit.create({
      data: { name: 'Integration test habit', color: '#c6ff34', freqType: 'DAILY', startDate: new Date('2026-01-01') },
    });
    await prisma.habitLog.create({ data: { habitId: habit.id, date: new Date('2026-01-02') } });

    await expect(
      prisma.habitLog.create({ data: { habitId: habit.id, date: new Date('2026-01-02') } })
    ).rejects.toThrow();

    await prisma.habit.delete({ where: { id: habit.id } });
  });
});
```

- [ ] **Step 6: Run the integration test**

Run: `npm run test:integration`
Expected: both tests in `app/lib/prisma.integration.test.ts` pass. (This requires the Postgres from Step 4 to be running; `npm test` in Task 1 does **not** run this file.)

- [ ] **Step 7: Commit**

```bash
git add prisma/ app/lib/prisma.ts app/lib/prisma.integration.test.ts package.json package-lock.json
git commit -m "feat: add Prisma schema and client for the Daybook data model"
```

---

## Task 4: Session module (sign/verify JWT session tokens)

**Files:**
- Create: `app/lib/session.ts`
- Test: `app/lib/session.test.ts`

**Interfaces:**
- Consumes: `process.env.SESSION_SECRET` (seeded by `vitest.setup.ts` in tests).
- Produces: `SessionPayload = { sub: 'owner'; expiresAt: number }`, `encryptSession(payload: SessionPayload): Promise<string>`, `decryptSession(token: string | undefined): Promise<SessionPayload | null>` — used by Task 6 (DAL) and Task 8 (login action).

- [ ] **Step 1: Install `jose`**

Run: `npm install jose`

- [ ] **Step 2: Write the failing test**

Create `app/lib/session.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { encryptSession, decryptSession } from '@/app/lib/session';

describe('session encrypt/decrypt', () => {
  test('round-trips a valid session', async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    const payload = await decryptSession(token);
    expect(payload?.sub).toBe('owner');
  });

  test('rejects a garbage token', async () => {
    await expect(decryptSession('not-a-real-token')).resolves.toBeNull();
  });

  test('rejects an undefined token', async () => {
    await expect(decryptSession(undefined)).resolves.toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run app/lib/session.test.ts`
Expected: FAIL — `Cannot find module '@/app/lib/session'`.

- [ ] **Step 4: Write the implementation**

Create `app/lib/session.ts`:
```ts
import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

export type SessionPayload = { sub: 'owner'; expiresAt: number };

function encodedKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt / 1000))
    .sign(encodedKey());
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey(), { algorithms: ['HS256'] });
    if (payload.sub !== 'owner' || typeof payload.exp !== 'number') return null;
    return { sub: 'owner', expiresAt: payload.exp * 1000 };
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/lib/session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add app/lib/session.ts app/lib/session.test.ts package.json package-lock.json
git commit -m "feat: add signed session token encrypt/decrypt"
```

---

## Task 5: Auth module (credential verification)

**Files:**
- Create: `app/lib/auth.ts`
- Test: `app/lib/auth.test.ts`

**Interfaces:**
- Consumes: `process.env.AUTH_EMAIL`, `process.env.AUTH_PASSWORD_HASH`.
- Produces: `verifyCredentials(email: string, password: string): Promise<boolean>` — used by Task 8 (login action).

- [ ] **Step 1: Write the failing test**

Create `app/lib/auth.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { verifyCredentials } from '@/app/lib/auth';

describe('verifyCredentials', () => {
  test('accepts the configured email (case-insensitive) and password', async () => {
    await expect(verifyCredentials('Owner@Example.com', 'correct-password')).resolves.toBe(true);
  });

  test('rejects the wrong password', async () => {
    await expect(verifyCredentials('owner@example.com', 'wrong-password')).resolves.toBe(false);
  });

  test('rejects an unknown email', async () => {
    await expect(verifyCredentials('nobody@example.com', 'correct-password')).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/auth.test.ts`
Expected: FAIL — `Cannot find module '@/app/lib/auth'`.

- [ ] **Step 3: Write the implementation**

Create `app/lib/auth.ts`:
```ts
import 'server-only';
import bcrypt from 'bcryptjs';

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = process.env.AUTH_EMAIL;
  const expectedHash = process.env.AUTH_PASSWORD_HASH;
  if (!expectedEmail || !expectedHash) return false;
  if (email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) return false;
  return bcrypt.compare(password, expectedHash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/auth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/auth.ts app/lib/auth.test.ts
git commit -m "feat: add single-account credential verification"
```

---

## Task 6: Session cookie name & Data Access Layer

**Files:**
- Create: `app/lib/session-cookie.ts`
- Create: `app/lib/dal.ts`
- Test: `app/lib/dal.test.ts`

**Interfaces:**
- Consumes: `encryptSession`/`decryptSession` from `@/app/lib/session` (Task 4).
- Produces: `SESSION_COOKIE_NAME: string` from `@/app/lib/session-cookie` (used by Task 7's `proxy.ts` and Task 8's login action); `getSession(): Promise<SessionPayload | null>` and `verifySession(): Promise<SessionPayload>` (redirects to `/login` if absent) from `@/app/lib/dal` — used by every later phase's Server Components/Actions.

- [ ] **Step 1: Create the shared cookie-name constant**

Create `app/lib/session-cookie.ts`:
```ts
export const SESSION_COOKIE_NAME = 'daybook_session';
```

(This lives in its own file, without `server-only`, so `proxy.ts` in Task 7 can import it without pulling in DAL's server-only guard.)

- [ ] **Step 2: Write the failing test**

Create `app/lib/dal.test.ts`:
```ts
import { describe, test, expect, vi, beforeEach } from 'vitest';

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

import { getSession, verifySession } from '@/app/lib/dal';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';

beforeEach(() => {
  cookieStore.clear();
});

describe('getSession', () => {
  test('returns null when there is no session cookie', async () => {
    await expect(getSession()).resolves.toBeNull();
  });

  test('returns the session payload for a valid cookie', async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
    const session = await getSession();
    expect(session?.sub).toBe('owner');
  });
});

describe('verifySession', () => {
  test('redirects to /login when there is no session', async () => {
    await expect(verifySession()).rejects.toThrow('REDIRECT:/login');
  });

  test('returns the session when valid', async () => {
    const token = await encryptSession({ sub: 'owner', expiresAt: Date.now() + 60_000 });
    cookieStore.set(SESSION_COOKIE_NAME, token);
    const session = await verifySession();
    expect(session.sub).toBe('owner');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run app/lib/dal.test.ts`
Expected: FAIL — `Cannot find module '@/app/lib/dal'`.

- [ ] **Step 4: Write the implementation**

Create `app/lib/dal.ts`:
```ts
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decryptSession, type SessionPayload } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return decryptSession(token);
}

export async function verifySession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/lib/dal.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add app/lib/session-cookie.ts app/lib/dal.ts app/lib/dal.test.ts
git commit -m "feat: add session cookie constant and Data Access Layer"
```

---

## Task 7: Proxy (route protection)

**Files:**
- Create: `app/lib/proxy-logic.ts`
- Create: `proxy.ts`
- Test: `app/lib/proxy-logic.test.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE_NAME` from `@/app/lib/session-cookie` (Task 6).
- Produces: `resolveProxyRedirect(pathname: string, hasSession: boolean): string | null` (pure, tested) and the `proxy` export in `proxy.ts` (thin wrapper, not unit tested — covered by the pure function plus manual verification in Task 9's dev-server check).

- [ ] **Step 1: Write the failing test**

Create `app/lib/proxy-logic.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { resolveProxyRedirect } from '@/app/lib/proxy-logic';

describe('resolveProxyRedirect', () => {
  test('sends anonymous visitors to /login', () => {
    expect(resolveProxyRedirect('/dashboard', false)).toBe('/login');
    expect(resolveProxyRedirect('/tasks', false)).toBe('/login');
  });

  test('lets anonymous visitors reach /login', () => {
    expect(resolveProxyRedirect('/login', false)).toBeNull();
  });

  test('sends signed-in visitors away from /login to /dashboard', () => {
    expect(resolveProxyRedirect('/login', true)).toBe('/dashboard');
  });

  test('lets signed-in visitors reach protected pages', () => {
    expect(resolveProxyRedirect('/dashboard', true)).toBeNull();
    expect(resolveProxyRedirect('/', true)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/proxy-logic.test.ts`
Expected: FAIL — `Cannot find module '@/app/lib/proxy-logic'`.

- [ ] **Step 3: Write the pure redirect logic**

Create `app/lib/proxy-logic.ts`:
```ts
const PUBLIC_PATHS = new Set(['/login']);

/**
 * Returns the path to redirect to, or null to let the request through.
 * `/` is intentionally left out of PUBLIC_PATHS: it does its own
 * session-based redirect in app/page.tsx, so Proxy should leave it alone.
 */
export function resolveProxyRedirect(pathname: string, hasSession: boolean): string | null {
  if (pathname === '/') return null;

  const isPublic = PUBLIC_PATHS.has(pathname);
  if (!isPublic && !hasSession) return '/login';
  if (isPublic && hasSession) return '/dashboard';
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/proxy-logic.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write `proxy.ts`**

Create `proxy.ts` (repo root, alongside `app/`):
```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';
import { resolveProxyRedirect } from '@/app/lib/proxy-logic';

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const target = resolveProxyRedirect(request.nextUrl.pathname, hasSession);

  if (target) {
    return NextResponse.redirect(new URL(target, request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico)$).*)'],
};
```

- [ ] **Step 6: Commit**

```bash
git add app/lib/proxy-logic.ts app/lib/proxy-logic.test.ts proxy.ts
git commit -m "feat: add proxy-based route protection"
```

---

## Task 8: Login Server Action

**Files:**
- Create: `app/login/actions.ts`

**Interfaces:**
- Consumes: `verifyCredentials` (Task 5), `encryptSession` (Task 4), `SESSION_COOKIE_NAME` (Task 6).
- Produces: `type LoginState = { error?: string } | undefined` and `login(prevState: LoginState, formData: FormData): Promise<LoginState>` — used by Task 9's login form. On success it sets the session cookie and redirects to `/dashboard` (redirect throws, so it never returns in that case).

This is thin glue over already-tested modules (`auth.ts`, `session.ts`), so it is not independently unit tested here — it's exercised end-to-end manually in Task 9's Step 6 and indirectly by the DAL/session/auth unit tests that cover its logic.

- [ ] **Step 1: Write the Server Action**

Create `app/login/actions.ts`:
```ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyCredentials } from '@/app/lib/auth';
import { encryptSession } from '@/app/lib/session';
import { SESSION_COOKIE_NAME } from '@/app/lib/session-cookie';

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const valid = await verifyCredentials(email, password);
  if (!valid) {
    return { error: 'Incorrect email or password.' };
  }

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = await encryptSession({ sub: 'owner', expiresAt });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/',
  });

  redirect('/dashboard');
}
```

- [ ] **Step 2: Commit**

```bash
git add app/login/actions.ts
git commit -m "feat: add login server action"
```

---

## Task 9: Login form & page

**Files:**
- Create: `app/login/login-form.tsx`
- Create: `app/login/page.tsx`
- Test: `app/login/login-form.test.tsx`

**Interfaces:**
- Consumes: `login`/`LoginState` from `./actions` (Task 8), only as a value passed in via props (the form component itself takes no server-only imports, so it's fully unit-testable).
- Produces: the `/login` route.

- [ ] **Step 1: Write the failing test**

Create `app/login/login-form.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { LoginForm } from '@/app/login/login-form';
import type { LoginState } from '@/app/login/actions';

describe('LoginForm', () => {
  test('renders email and password fields and a submit button', () => {
    render(<LoginForm action={vi.fn(async (): Promise<LoginState> => undefined)} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows the error message returned by the action', async () => {
    const action = vi.fn(async (): Promise<LoginState> => ({ error: 'Incorrect email or password.' }));
    render(<LoginForm action={action} />);

    await userEvent.type(screen.getByLabelText('Email'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/login/login-form.test.tsx`
Expected: FAIL — `Cannot find module '@/app/login/login-form'`.

- [ ] **Step 3: Write the login form**

Create `app/login/login-form.tsx`:
```tsx
'use client';

import { useActionState } from 'react';
import type { LoginState } from './actions';

const fieldStyle: React.CSSProperties = {
  height: 40,
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
};

export interface LoginFormProps {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
}

export function LoginForm({ action }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(action, undefined);

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="email" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="username" style={fieldStyle} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="password" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          Password
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" style={fieldStyle} />
      </div>
      {state?.error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', margin: 0 }}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          height: 40,
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--accent)',
          color: 'var(--on-accent)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 'var(--weight-medium)',
          fontSize: 'var(--text-sm)',
          cursor: pending ? 'default' : 'pointer',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/login/login-form.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the login page**

Create `app/login/page.tsx`:
```tsx
import { login } from './actions';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        padding: 'var(--space-6)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
          padding: 'var(--space-8)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-2xl)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--weight-bold)',
            }}
          >
            D
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lg)' }}>
            Daybook
          </span>
        </div>
        <LoginForm action={login} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Manual end-to-end check**

Run: `npm run dev`, visit `http://localhost:3000/login`, submit wrong credentials (expect the error message), then submit the credentials matching your `.env`'s `AUTH_EMAIL`/`AUTH_PASSWORD_HASH` (expect a redirect toward `/dashboard`, which 404s until Task 22 — that 404 is expected at this point in the plan).

- [ ] **Step 7: Commit**

```bash
git add app/login/login-form.tsx app/login/page.tsx app/login/login-form.test.tsx
git commit -m "feat: add login page and form"
```

---

## Task 10: Copy the Klivr design system CSS and wire up global styles

**Files:**
- Create: `app/styles/klivr/tokens/fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css` (copied verbatim)
- Create: `app/styles/klivr/styles.css` (copied verbatim)
- Create: `app/styles/layout.css`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Test: `app/styles/tokens.test.ts`

**Interfaces:**
- Produces: every CSS custom property used by Tasks 11–23 (`--accent`, `--surface`, `--bg`, `--text-primary`, `--radius-*`, `--space-*`, `--shadow-*`, `--font-*`, etc.), plus the `.pw-sidebar` / `.pw-bottomnav` breakpoint classes used by Task 20/21/22.

- [ ] **Step 1: Copy the design system files verbatim**

Run (from the repo root):
```bash
mkdir -p "app/styles/klivr/tokens"
cp "Personal productivity webapp/_ds/klivr-design-system-3b321960-77a8-413a-a952-306d16a5c187/tokens/fonts.css" "app/styles/klivr/tokens/fonts.css"
cp "Personal productivity webapp/_ds/klivr-design-system-3b321960-77a8-413a-a952-306d16a5c187/tokens/colors.css" "app/styles/klivr/tokens/colors.css"
cp "Personal productivity webapp/_ds/klivr-design-system-3b321960-77a8-413a-a952-306d16a5c187/tokens/typography.css" "app/styles/klivr/tokens/typography.css"
cp "Personal productivity webapp/_ds/klivr-design-system-3b321960-77a8-413a-a952-306d16a5c187/tokens/spacing.css" "app/styles/klivr/tokens/spacing.css"
cp "Personal productivity webapp/_ds/klivr-design-system-3b321960-77a8-413a-a952-306d16a5c187/tokens/effects.css" "app/styles/klivr/tokens/effects.css"
cp "Personal productivity webapp/_ds/klivr-design-system-3b321960-77a8-413a-a952-306d16a5c187/styles.css" "app/styles/klivr/styles.css"
```

- [ ] **Step 2: Write the failing regression test**

This test guards against the copied token files being hand-edited by accident later (they must stay byte-identical to the design source).

Create `app/styles/tokens.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const stylesDir = path.resolve(__dirname, 'klivr');

describe('Klivr design tokens', () => {
  test('colors.css defines the signature accent and dark surface', () => {
    const css = readFileSync(path.join(stylesDir, 'tokens/colors.css'), 'utf-8');
    expect(css).toContain('--accent-500: #c6ff34');
    expect(css).toContain('--neutral-900: #171717');
  });

  test('spacing.css defines the card radius', () => {
    const css = readFileSync(path.join(stylesDir, 'tokens/spacing.css'), 'utf-8');
    expect(css).toContain('--radius-2xl: 28px');
  });

  test('styles.css imports all five token files', () => {
    const css = readFileSync(path.join(stylesDir, 'styles.css'), 'utf-8');
    for (const file of ['fonts.css', 'colors.css', 'typography.css', 'spacing.css', 'effects.css']) {
      expect(css).toContain(file);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run app/styles/tokens.test.ts`
Expected: FAIL if any file is missing or wasn't copied — since Step 1 already copied them, this should actually PASS immediately. If it fails, re-check Step 1's copy paths.

- [ ] **Step 4: Create the shared layout CSS**

This is the mockup's own responsive `.pw-*` class block, copied verbatim from `Personal productivity webapp/Productivity Klivr.dc.html` (its inline `<style>` tag).

Create `app/styles/layout.css`:
```css
body { margin: 0; }
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-hover); }
[data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator,
[data-theme="dark"] input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(1) opacity(0.6);
}
:root {
  --pw-top: 28px;
  --pw-bottom: 0px;
  --pw-vh: calc(100dvh - var(--pw-top) - var(--pw-bottom));
}
.pw-bottomnav { display: none; }
.pw-cal-scroll { scroll-snap-type: x mandatory; scroll-padding-left: 56px; }
.pw-board { display: flex; align-items: flex-start; gap: var(--space-4); overflow-x: auto; overflow-y: hidden; padding: 0 14px; cursor: grab; }
.pw-list-col { flex: none; width: 272px; display: flex; flex-direction: column; gap: var(--space-2); max-height: 100%; }
.pw-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.pw-scroll::-webkit-scrollbar-track { background: transparent; }
.pw-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--text-primary) 13%, transparent); border-radius: 999px; border: 3px solid transparent; background-clip: padding-box; }
.pw-scroll:hover::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--text-primary) 26%, transparent); background-clip: padding-box; }
.pw-scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--accent) 60%, transparent); background-clip: padding-box; }
.pw-scroll { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--text-primary) 16%, transparent) transparent; }
.pw-viewpill { position: fixed; left: 50%; transform: translateX(-50%); bottom: 22px; z-index: 18; display: flex; gap: 2px; padding: 4px; border-radius: var(--radius-pill); background: color-mix(in srgb, var(--surface) 92%, transparent); border: 1px solid var(--border); box-shadow: var(--shadow-lg); backdrop-filter: var(--blur-sm); }
.pw-viewpill button { appearance: none; border: none; background: transparent; color: var(--text-secondary); font-family: var(--font-sans); font-weight: var(--weight-medium); font-size: var(--text-xs); padding: 7px 14px; border-radius: var(--radius-pill); cursor: pointer; white-space: nowrap; transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out); }
.pw-viewpill button:hover { color: var(--text-primary); background: var(--surface-3); }
.pw-viewpill button[data-on="1"] { color: var(--on-accent); background: var(--accent); }
.pw-matrix { display: flex; height: var(--pw-vh); min-height: 0; }
.pw-habit-split { display: flex; gap: 0; flex: 1; min-height: 0; align-items: stretch; }
.pw-habit-left { flex: none; width: auto; max-width: 60%; display: flex; flex-direction: column; gap: var(--space-3); overflow-y: auto; padding: 0 var(--space-4) 24px clamp(16px, 3vw, 32px); }
.pw-habit-right { flex: 1; min-width: 0; border-left: 1px solid var(--border); overflow-y: auto; padding: 0 clamp(16px, 3vw, 32px) 24px var(--space-4); }
@media (max-width: 900px) {
  .pw-matrix { flex-direction: column; height: auto; overflow: visible; }
  .pw-matrix-left, .pw-matrix-right { overflow: visible !important; flex: none !important; border-left: none !important; }
  .pw-matrix-right { border-top: 1px solid var(--border); padding-top: var(--space-4) !important; }
  .pw-habit-split { flex-direction: column; overflow-y: auto; }
  .pw-habit-left { width: 100%; max-width: 100%; overflow: visible; padding-right: clamp(16px, 3vw, 32px); }
  .pw-habit-right { border-left: none; border-top: 1px solid var(--border); overflow: visible; padding-top: var(--space-4); padding-left: clamp(16px, 3vw, 32px); }
}
@media (max-width: 560px) {
  .pw-two { grid-template-columns: minmax(0, 1fr) !important; }
}
@media (max-width: 1100px) {
  .pw-today-grid { grid-template-columns: 1fr 1fr; }
  .pw-journal-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 860px) {
  :root { --pw-top: 18px; --pw-bottom: 76px; }
  .pw-sidebar { display: none; }
  .pw-bottomnav { display: flex; }
  .pw-today-grid { grid-template-columns: 1fr; }
  .pw-viewpill { bottom: calc(84px + env(safe-area-inset-bottom)); max-width: calc(100vw - 20px); overflow-x: auto; justify-content: flex-start; }
  .pw-viewpill button { padding: 7px 11px; }
  .pw-calhead { gap: var(--space-2) !important; }
  .pw-board { padding: 0 !important; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; gap: 0 !important; }
  .pw-list-col { width: 100vw !important; box-sizing: border-box; padding: 0 14px; scroll-snap-align: center; scroll-snap-stop: always; }
  .pw-matrix-left { padding: 0 12px 24px !important; }
  .pw-matrix-right { padding: 0 12px 24px !important; border-top: none !important; padding-top: 0 !important; }
  .pw-quadgrid { gap: var(--space-2) !important; }
  .pw-habit-left { padding: 0 12px 24px !important; }
  .pw-habit-right { padding: 0 12px 24px !important; border-top: none !important; }
}
```

- [ ] **Step 5: Wire the CSS into `app/globals.css`**

Replace the contents of `app/globals.css` with:
```css
@import "tailwindcss";
@import "./styles/klivr/styles.css";
@import "./styles/layout.css";
```

- [ ] **Step 6: Replace the default font loading in `app/layout.tsx`**

Replace `app/layout.tsx` entirely with:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daybook",
  description: "Personal productivity: tasks, matrix, calendar, habits, journal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

(The Klivr fonts — Space Grotesk, Geist, JetBrains Mono — are now loaded via the `@import url(...)` lines inside `app/styles/klivr/tokens/fonts.css`, matching the design source exactly, instead of the Create-Next-App default `next/font` Geist loading.)

- [ ] **Step 7: Run the token test and the full suite**

Run: `npm test`
Expected: all tests pass, including the 3 new tests in `app/styles/tokens.test.ts`.

- [ ] **Step 8: Manual visual check**

Run: `npm run dev`, visit `http://localhost:3000/login`. Expected: dark near-black background, the lime "D" badge, Space Grotesk heading, Geist body text on the form labels/inputs.

- [ ] **Step 9: Commit**

```bash
git add app/styles/ app/globals.css app/layout.tsx
git commit -m "feat: copy Klivr design system CSS and wire up global styles"
```

---

## Task 11: Icon set

**Files:**
- Create: `app/components/icons.tsx`
- Test: `app/components/icons.test.tsx`

**Interfaces:**
- Produces: `type IconName = 'home' | 'check-square' | 'calendar' | 'grid' | 'flame' | 'book' | 'plus' | 'check' | 'left' | 'right' | 'trash' | 'pencil' | 'grip' | 'flag' | 'panel' | 'menu' | 'ban' | 'sun' | 'moon'` and `Icon({ name, size, ...svgProps })` — used by Tasks 13 (CheckToggle uses its own inline check path, not this), 20 (Sidebar), 21 (BottomNav), and every later phase.

All path data below is copied verbatim from the `<svg><defs>` sprite at the top of `Personal productivity webapp/Productivity Klivr.dc.html` (Lucide icons).

- [ ] **Step 1: Write the failing test**

Create `app/components/icons.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Icon, type IconName } from '@/app/components/icons';

const ALL_ICONS: IconName[] = [
  'home', 'check-square', 'calendar', 'grid', 'flame', 'book',
  'plus', 'check', 'left', 'right', 'trash', 'pencil', 'grip',
  'flag', 'panel', 'menu', 'ban', 'sun', 'moon',
];

describe('Icon', () => {
  test.each(ALL_ICONS)('renders an svg with at least one shape for "%s"', (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.children.length).toBeGreaterThan(0);
  });

  test('applies the requested size', () => {
    const { container } = render(<Icon name="home" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/icons.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/icons'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/icons.tsx`:
```tsx
import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'home' | 'check-square' | 'calendar' | 'grid' | 'flame' | 'book'
  | 'plus' | 'check' | 'left' | 'right' | 'trash' | 'pencil' | 'grip'
  | 'flag' | 'panel' | 'menu' | 'ban' | 'sun' | 'moon';

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  'check-square': (
    <>
      <path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11.344" />
      <path d="m9 11 3 3L22 4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  flame: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  book: (
    <>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </>
  ),
  plus: (
    <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="19" r="1" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />,
};

const FILLED_ICONS = new Set<IconName>(['grip']);

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, style, ...rest }: IconProps) {
  const filled = FILLED_ICONS.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none', ...style }}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/icons.test.tsx`
Expected: PASS (20 tests: 19 from `test.each` + 1 size test).

- [ ] **Step 5: Commit**

```bash
git add app/components/icons.tsx app/components/icons.test.tsx
git commit -m "feat: add shared icon set"
```

---

## Task 12: Button component

**Files:**
- Create: `app/components/ui/button.tsx`
- Test: `app/components/ui/button.test.tsx`

**Interfaces:**
- Produces: `Button({ variant, size, children, ...buttonProps })`, `variant: 'primary' | 'secondary' | 'ghost' | 'outline'` (default `'primary'`), `size: 'sm' | 'md'` (default `'md'`) — used throughout later phases.

- [ ] **Step 1: Write the failing test**

Create `app/components/ui/button.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Button } from '@/app/components/ui/button';

describe('Button', () => {
  test('renders its children and defaults to type="button"', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  test('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('is disabled when the disabled prop is set', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('primary and secondary variants render different backgrounds', () => {
    const { rerender } = render(<Button variant="primary">Go</Button>);
    const primaryBg = screen.getByRole('button').style.background;
    rerender(<Button variant="secondary">Go</Button>);
    const secondaryBg = screen.getByRole('button').style.background;
    expect(primaryBg).not.toBe(secondaryBg);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/ui/button.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/ui/button'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/ui/button.tsx`:
```tsx
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md';

const base: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--weight-medium)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: '1px solid transparent',
};

const sizes: Record<Size, CSSProperties> = {
  sm: { height: 32, padding: '0 12px', fontSize: 'var(--text-xs)' },
  md: { height: 40, padding: '0 16px', fontSize: 'var(--text-sm)' },
};

const variants: Record<Variant, CSSProperties> = {
  primary: { background: 'var(--accent)', color: 'var(--on-accent)' },
  secondary: { background: 'var(--surface-3)', color: 'var(--text-primary)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)' },
  outline: { background: 'transparent', color: 'var(--text-primary)', borderColor: 'var(--border-strong)' },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', style, children, type, ...rest }: ButtonProps) {
  return (
    <button type={type ?? 'button'} style={{ ...base, ...sizes[size], ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/ui/button.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/button.tsx app/components/ui/button.test.tsx
git commit -m "feat: add shared Button component"
```

---

## Task 13: IconButton component

**Files:**
- Create: `app/components/ui/icon-button.tsx`
- Test: `app/components/ui/icon-button.test.tsx`

**Interfaces:**
- Produces: `IconButton({ label, variant, size, children, ...buttonProps })` — a square icon-only button; `label` is required and becomes the `aria-label`/`title`.

- [ ] **Step 1: Write the failing test**

Create `app/components/ui/icon-button.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { IconButton } from '@/app/components/ui/icon-button';

describe('IconButton', () => {
  test('exposes the label as an accessible name', () => {
    render(<IconButton label="Add task"><span>+</span></IconButton>);
    expect(screen.getByRole('button', { name: 'Add task' })).toBeInTheDocument();
  });

  test('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<IconButton label="Add task" onClick={onClick}><span>+</span></IconButton>);
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('sm and md sizes render different dimensions', () => {
    const { rerender } = render(<IconButton label="X" size="sm"><span>+</span></IconButton>);
    const smWidth = screen.getByRole('button').style.width;
    rerender(<IconButton label="X" size="md"><span>+</span></IconButton>);
    const mdWidth = screen.getByRole('button').style.width;
    expect(smWidth).not.toBe(mdWidth);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/ui/icon-button.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/ui/icon-button'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/ui/icon-button.tsx`:
```tsx
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md';

const dimensions: Record<Size, number> = { sm: 32, md: 40 };

const variants: Record<Variant, CSSProperties> = {
  primary: { background: 'var(--accent)', color: 'var(--on-accent)' },
  secondary: { background: 'var(--surface-3)', color: 'var(--text-primary)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)' },
  outline: { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' },
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function IconButton({ label, variant = 'secondary', size = 'md', style, children, type, ...rest }: IconButtonProps) {
  const dimension = dimensions[size];
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      style={{
        width: dimension,
        height: dimension,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        border: '1px solid transparent',
        cursor: 'pointer',
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/ui/icon-button.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/icon-button.tsx app/components/ui/icon-button.test.tsx
git commit -m "feat: add shared IconButton component"
```

---

## Task 14: Input component

**Files:**
- Create: `app/components/ui/input.tsx`
- Test: `app/components/ui/input.test.tsx`

**Interfaces:**
- Produces: `Input` (forwardRef to `HTMLInputElement`), props `label?: string`, `error?: string`, `size?: 'sm' | 'md'`, plus all native `<input>` props.

- [ ] **Step 1: Write the failing test**

Create `app/components/ui/input.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Input } from '@/app/components/ui/input';

describe('Input', () => {
  test('associates the label with the input', () => {
    render(<Input label="Task" placeholder="What needs doing?" onChange={() => {}} />);
    expect(screen.getByLabelText('Task')).toBeInTheDocument();
  });

  test('calls onChange as the user types', async () => {
    const onChange = vi.fn();
    render(<Input label="Task" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Task'), 'Buy milk');
    expect(onChange).toHaveBeenCalled();
  });

  test('renders an error message with role="alert"', () => {
    render(<Input label="Task" error="Required" onChange={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/ui/input.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/ui/input'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/ui/input.tsx`:
```tsx
import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  size?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, size = 'md', id, style, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const height = size === 'sm' ? 32 : 40;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        style={{
          height,
          width: '100%',
          boxSizing: 'border-box',
          padding: '0 12px',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          outline: 'none',
          ...style,
        }}
        {...rest}
      />
      {error && (
        <span role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>
          {error}
        </span>
      )}
    </div>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/ui/input.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/input.tsx app/components/ui/input.test.tsx
git commit -m "feat: add shared Input component"
```

---

## Task 15: Select component

**Files:**
- Create: `app/components/ui/select.tsx`
- Test: `app/components/ui/select.test.tsx`

**Interfaces:**
- Produces: `Select` (forwardRef to `HTMLSelectElement`), `SelectOption = { value: string; label: string }`, props `label?: string`, `options: SelectOption[]`, plus native `<select>` props.

- [ ] **Step 1: Write the failing test**

Create `app/components/ui/select.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Select } from '@/app/components/ui/select';

const options = [
  { value: 'work', label: 'Work' },
  { value: 'home', label: 'Home' },
];

describe('Select', () => {
  test('associates the label and lists every option', () => {
    render(<Select label="List" options={options} onChange={() => {}} value="work" />);
    const select = screen.getByLabelText('List');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Home' })).toBeInTheDocument();
  });

  test('calls onChange when a different option is picked', async () => {
    const onChange = vi.fn();
    render(<Select label="List" options={options} onChange={onChange} value="work" />);
    await userEvent.selectOptions(screen.getByLabelText('List'), 'home');
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/ui/select.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/ui/select'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/ui/select.tsx`:
```tsx
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, id, style, ...rest },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {label && (
        <label htmlFor={selectId} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        style={{
          height: 40,
          width: '100%',
          boxSizing: 'border-box',
          padding: '0 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          outline: 'none',
          ...style,
        }}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/ui/select.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/select.tsx app/components/ui/select.test.tsx
git commit -m "feat: add shared Select component"
```

---

## Task 16: Dialog component

**Files:**
- Create: `app/components/ui/dialog.tsx`
- Test: `app/components/ui/dialog.test.tsx`

**Interfaces:**
- Produces: `Dialog({ open, onClose, title, children })` — a scrim + panel modal (implemented with plain `div`s rather than the native `<dialog>` element, since jsdom's `<dialog>`/`showModal()` support is unreliable for testing). Used by every later phase's create/edit forms.

- [ ] **Step 1: Write the failing test**

Create `app/components/ui/dialog.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Dialog } from '@/app/components/ui/dialog';

describe('Dialog', () => {
  test('renders nothing when closed', () => {
    render(<Dialog open={false} onClose={vi.fn()} title="Edit task">content</Dialog>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders the title and children when open', () => {
    render(<Dialog open onClose={vi.fn()} title="Edit task"><p>content</p></Dialog>);
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  test('calls onClose when the overlay is clicked', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Edit task"><p>content</p></Dialog>);
    await userEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('does not call onClose when the panel itself is clicked', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Edit task"><p>content</p></Dialog>);
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  test('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Edit task"><p>content</p></Dialog>);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Edit task"><p>content</p></Dialog>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/ui/dialog.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/ui/dialog'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/ui/dialog.tsx`:
```tsx
'use client';

import { useEffect, type ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'color-mix(in srgb, black 55%, transparent)',
        backdropFilter: 'var(--blur-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lg)' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/ui/dialog.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/dialog.tsx app/components/ui/dialog.test.tsx
git commit -m "feat: add shared Dialog component"
```

---

## Task 17: CheckToggle component

**Files:**
- Create: `app/components/ui/check-toggle.tsx`
- Test: `app/components/ui/check-toggle.test.tsx`

**Interfaces:**
- Produces: `CheckToggle({ checked, onToggle, label, accentColor? })` — the shared 20×20 checkbox-style control used for both "task done" and "habit done today" toggles in later phases. Stops click propagation so it can sit inside a clickable row without also triggering the row's own click handler.

- [ ] **Step 1: Write the failing test**

Create `app/components/ui/check-toggle.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { CheckToggle } from '@/app/components/ui/check-toggle';

describe('CheckToggle', () => {
  test('reflects the checked state via aria-checked', () => {
    const { rerender } = render(<CheckToggle checked={false} onToggle={vi.fn()} label="Buy milk" />);
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toHaveAttribute('aria-checked', 'false');
    rerender(<CheckToggle checked onToggle={vi.fn()} label="Buy milk" />);
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toHaveAttribute('aria-checked', 'true');
  });

  test('calls onToggle once and does not bubble to a parent click handler', async () => {
    const onToggle = vi.fn();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <CheckToggle checked={false} onToggle={onToggle} label="Buy milk" />
      </div>
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Buy milk' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/ui/check-toggle.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/ui/check-toggle'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/ui/check-toggle.tsx`:
```tsx
'use client';

export interface CheckToggleProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  accentColor?: string;
}

export function CheckToggle({ checked, onToggle, label, accentColor }: CheckToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{
        width: 20,
        height: 20,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-xs)',
        border: checked ? 'none' : '1.5px solid var(--border-strong)',
        background: checked ? (accentColor ?? 'var(--accent)') : 'transparent',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {checked && (
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/ui/check-toggle.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/check-toggle.tsx app/components/ui/check-toggle.test.tsx
git commit -m "feat: add shared CheckToggle component"
```

---

## Task 18: PriorityFlag component

**Files:**
- Create: `app/components/ui/priority-flag.tsx`
- Test: `app/components/ui/priority-flag.test.tsx`

**Interfaces:**
- Produces: `PRIORITY_COLORS: Record<'RED' | 'AMBER' | 'BLUE' | 'GREEN', string>`, `type PriorityKey = keyof typeof PRIORITY_COLORS`, `PriorityFlag({ priority: PriorityKey })` — used by Tasks/Matrix/Calendar/Agenda in later phases. The four hex values and their meanings are copied verbatim from the mockup's priority map.

- [ ] **Step 1: Write the failing test**

Create `app/components/ui/priority-flag.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { PriorityFlag, PRIORITY_COLORS } from '@/app/components/ui/priority-flag';

describe('PriorityFlag', () => {
  test('renders with an accessible label naming the priority', () => {
    render(<PriorityFlag priority="RED" />);
    expect(screen.getByRole('img', { name: 'Priority: red' })).toBeInTheDocument();
  });

  test('uses the correct color per priority', () => {
    (['RED', 'AMBER', 'BLUE', 'GREEN'] as const).forEach((priority) => {
      const { unmount } = render(<PriorityFlag priority={priority} />);
      const svg = screen.getByRole('img', { name: `Priority: ${priority.toLowerCase()}` });
      expect(svg).toHaveAttribute('stroke', PRIORITY_COLORS[priority]);
      unmount();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/ui/priority-flag.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/ui/priority-flag'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/ui/priority-flag.tsx`:
```tsx
export const PRIORITY_COLORS = {
  RED: '#f87171',
  AMBER: '#fbbf24',
  BLUE: '#60a5fa',
  GREEN: '#4ade80',
} as const;

export type PriorityKey = keyof typeof PRIORITY_COLORS;

export function PriorityFlag({ priority }: { priority: PriorityKey }) {
  return (
    <svg
      role="img"
      aria-label={`Priority: ${priority.toLowerCase()}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke={PRIORITY_COLORS[priority]}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 14, height: 14, flex: 'none' }}
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/ui/priority-flag.test.tsx`
Expected: PASS (2 tests — the second runs 4 assertions across the `forEach`).

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/priority-flag.tsx app/components/ui/priority-flag.test.tsx
git commit -m "feat: add shared PriorityFlag component"
```

---

## Task 19: PillToggle component

**Files:**
- Create: `app/components/ui/pill-toggle.tsx`
- Test: `app/components/ui/pill-toggle.test.tsx`

**Interfaces:**
- Produces: `PillToggle<T extends string>({ options, value, onChange, ariaLabel })` — the shared rounded-pill single-select control used later for the calendar view switcher, the matrix mobile tabs, the mood picker, and the habit-frequency picker.

- [ ] **Step 1: Write the failing test**

Create `app/components/ui/pill-toggle.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { PillToggle } from '@/app/components/ui/pill-toggle';

const options = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
] as const;

describe('PillToggle', () => {
  test('marks the active option as selected', () => {
    render(<PillToggle options={options} value="day" onChange={vi.fn()} ariaLabel="Calendar view" />);
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'false');
  });

  test('calls onChange with the clicked option value', async () => {
    const onChange = vi.fn();
    render(<PillToggle options={options} value="day" onChange={onChange} ariaLabel="Calendar view" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    expect(onChange).toHaveBeenCalledWith('week');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/ui/pill-toggle.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/ui/pill-toggle'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/ui/pill-toggle.tsx`:
```tsx
'use client';

export interface PillOption<T extends string> {
  value: T;
  label: string;
}

export interface PillToggleProps<T extends string> {
  options: readonly PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function PillToggle<T extends string>({ options, value, onChange, ariaLabel }: PillToggleProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{ display: 'inline-flex', gap: 2, padding: 4, borderRadius: 'var(--radius-pill)', background: 'var(--surface-3)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              appearance: 'none',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              padding: '7px 14px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 'var(--weight-medium)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              color: active ? 'var(--on-accent)' : 'var(--text-secondary)',
              background: active ? 'var(--accent)' : 'transparent',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/ui/pill-toggle.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/pill-toggle.tsx app/components/ui/pill-toggle.test.tsx
git commit -m "feat: add shared PillToggle component"
```

---

## Task 20: Sidebar component

**Files:**
- Create: `app/components/shell/nav-items.ts`
- Create: `app/components/shell/sidebar.tsx`
- Test: `app/components/shell/sidebar.test.tsx`

**Interfaces:**
- Consumes: `Icon` (Task 11).
- Produces: `type NavItem = { key: string; label: string; href: string; icon: IconName }`, `NAV_ITEMS: readonly NavItem[]` from `@/app/components/shell/nav-items` (also used by Task 21's BottomNav and Task 22's AppShell); `Sidebar({ items, activeKey, open, onToggleOpen, theme, onToggleTheme })`.

- [ ] **Step 1: Write the nav item list**

Create `app/components/shell/nav-items.ts`:
```ts
import type { IconName } from '@/app/components/icons';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: IconName;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Today', href: '/dashboard', icon: 'home' },
  { key: 'tasks', label: 'Tasks', href: '/tasks', icon: 'check-square' },
  { key: 'calendar', label: 'Calendar', href: '/calendar', icon: 'calendar' },
  { key: 'matrix', label: 'Matrix', href: '/matrix', icon: 'grid' },
  { key: 'habits', label: 'Habits', href: '/habits', icon: 'flame' },
  { key: 'journal', label: 'Journal', href: '/journal', icon: 'book' },
];
```

- [ ] **Step 2: Write the failing test**

Create `app/components/shell/sidebar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { Sidebar } from '@/app/components/shell/sidebar';
import { NAV_ITEMS } from '@/app/components/shell/nav-items';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('Sidebar', () => {
  test('renders a link for every nav item, highlighting the active one', () => {
    render(
      <Sidebar items={NAV_ITEMS} activeKey="tasks" open theme="dark" onToggleOpen={vi.fn()} onToggleTheme={vi.fn()} />
    );
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.href);
    }
    expect(screen.getByRole('link', { name: 'Tasks' }).style.color).toBe('var(--accent)');
    expect(screen.getByRole('link', { name: 'Today' }).style.color).toBe('var(--text-secondary)');
  });

  test('hides labels and the app name when collapsed', () => {
    render(
      <Sidebar items={NAV_ITEMS} activeKey="tasks" open={false} theme="dark" onToggleOpen={vi.fn()} onToggleTheme={vi.fn()} />
    );
    expect(screen.queryByText('Daybook')).not.toBeInTheDocument();
    expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(NAV_ITEMS.length);
  });

  test('calls onToggleOpen when the collapse button is clicked', async () => {
    const onToggleOpen = vi.fn();
    render(
      <Sidebar items={NAV_ITEMS} activeKey="tasks" open theme="dark" onToggleOpen={onToggleOpen} onToggleTheme={vi.fn()} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(onToggleOpen).toHaveBeenCalledOnce();
  });

  test('shows the opposite-mode label on the theme button and calls onToggleTheme', async () => {
    const onToggleTheme = vi.fn();
    render(
      <Sidebar items={NAV_ITEMS} activeKey="tasks" open theme="dark" onToggleOpen={vi.fn()} onToggleTheme={onToggleTheme} />
    );
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toHaveTextContent('Dark');
    await userEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run app/components/shell/sidebar.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/shell/sidebar'`.

- [ ] **Step 4: Write the implementation**

Create `app/components/shell/sidebar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { Icon } from '@/app/components/icons';
import type { NavItem } from './nav-items';

export interface SidebarProps {
  items: readonly NavItem[];
  activeKey: string;
  open: boolean;
  onToggleOpen: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function Sidebar({ items, activeKey, open, onToggleOpen, theme, onToggleTheme }: SidebarProps) {
  return (
    <aside
      className="pw-sidebar"
      style={{
        width: open ? '220px' : '64px',
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-4) 10px',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        transition: 'width .16s var(--ease-out)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', minHeight: 28 }}>
        {open && (
          <>
            <span
              style={{
                width: 22, height: 22, flex: 'none', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: 'var(--on-accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)',
                fontWeight: 'var(--weight-bold)', fontSize: 13,
              }}
            >
              D
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', fontSize: 'var(--text-md)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              Daybook
            </span>
          </>
        )}
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-sm)', flex: 'none', margin: open ? undefined : '0 auto', display: 'flex' }}
        >
          <Icon name={open ? 'panel' : 'menu'} size={17} />
        </button>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center',
                gap: 'var(--space-3)', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-subtle)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              <Icon name={item.icon} size={18} />
              {open && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
          style={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center', gap: 'var(--space-3)', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', cursor: 'pointer' }}
        >
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={16} />
          {open && <span style={{ whiteSpace: 'nowrap' }}>{theme === 'dark' ? 'Dark' : 'Light'}</span>}
        </button>
        {open && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 var(--space-2)' }}>
            Synced to your account
          </div>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/components/shell/sidebar.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add app/components/shell/nav-items.ts app/components/shell/sidebar.tsx app/components/shell/sidebar.test.tsx
git commit -m "feat: add Sidebar navigation component"
```

---

## Task 21: BottomNav component

**Files:**
- Create: `app/components/shell/bottom-nav.tsx`
- Test: `app/components/shell/bottom-nav.test.tsx`

**Interfaces:**
- Consumes: `NavItem`, `NAV_ITEMS` (Task 20), `Icon` (Task 11).
- Produces: `BottomNav({ items, activeKey })` — always rendered in the DOM; visibility across the 860px breakpoint is handled purely by the `.pw-bottomnav` CSS class from Task 10, not by JS.

- [ ] **Step 1: Write the failing test**

Create `app/components/shell/bottom-nav.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { BottomNav } from '@/app/components/shell/bottom-nav';
import { NAV_ITEMS } from '@/app/components/shell/nav-items';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('BottomNav', () => {
  test('renders a link for every nav item, highlighting the active one', () => {
    render(<BottomNav items={NAV_ITEMS} activeKey="habits" />);
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toHaveAttribute('href', item.href);
    }
    expect(screen.getByRole('link', { name: /Habits/ }).style.color).toBe('var(--accent)');
    expect(screen.getByRole('link', { name: /Tasks/ }).style.color).toBe('var(--text-muted)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/shell/bottom-nav.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/shell/bottom-nav'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/shell/bottom-nav.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { Icon } from '@/app/components/icons';
import type { NavItem } from './nav-items';

export interface BottomNavProps {
  items: readonly NavItem[];
  activeKey: string;
}

export function BottomNav({ items, activeKey }: BottomNavProps) {
  return (
    <nav
      className="pw-bottomnav"
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '6px 4px calc(6px + env(safe-area-inset-bottom))', zIndex: 20 }}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 2px', fontSize: 10, flex: 1, color: active ? 'var(--accent)' : 'var(--text-muted)', textDecoration: 'none' }}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/shell/bottom-nav.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add app/components/shell/bottom-nav.tsx app/components/shell/bottom-nav.test.tsx
git commit -m "feat: add BottomNav navigation component"
```

---

## Task 22: AppShell and the authenticated route group layout

**Files:**
- Create: `app/components/shell/app-shell.tsx`
- Create: `app/(app)/layout.tsx`
- Test: `app/components/shell/app-shell.test.tsx`

**Interfaces:**
- Consumes: `Sidebar` (Task 20), `BottomNav` (Task 21), `NAV_ITEMS` (Task 20), `verifySession` (Task 6).
- Produces: `AppShell({ initialTheme, initialSidebarOpen, children })` — owns `theme`/`sidebarOpen` client state, persists both to cookies, and computes the active nav key from the current pathname. `app/(app)/layout.tsx` wraps every route under the `(app)` group (Task 23's stub pages) with an auth check + `AppShell`.

- [ ] **Step 1: Write the failing test**

Create `app/components/shell/app-shell.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { AppShell } from '@/app/components/shell/app-shell';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/tasks',
}));

describe('AppShell', () => {
  test('applies the initial theme to the root element', () => {
    const { container } = render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>content</p>
      </AppShell>
    );
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'dark');
  });

  test('renders children inside <main>', () => {
    render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>dashboard content</p>
      </AppShell>
    );
    expect(screen.getByText('dashboard content')).toBeInTheDocument();
  });

  test('flips the theme attribute when the sidebar theme button is clicked', async () => {
    const { container } = render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>content</p>
      </AppShell>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(container.firstElementChild).toHaveAttribute('data-theme', 'light');
  });

  test('marks the Tasks nav item active based on the current pathname', () => {
    render(
      <AppShell initialTheme="dark" initialSidebarOpen>
        <p>content</p>
      </AppShell>
    );
    const tasksLinks = screen.getAllByRole('link', { name: /Tasks/ });
    expect(tasksLinks.some((link) => link.style.color === 'var(--accent)')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/shell/app-shell.test.tsx`
Expected: FAIL — `Cannot find module '@/app/components/shell/app-shell'`.

- [ ] **Step 3: Write the implementation**

Create `app/components/shell/app-shell.tsx`:
```tsx
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { NAV_ITEMS } from './nav-items';

export interface AppShellProps {
  initialTheme: 'dark' | 'light';
  initialSidebarOpen: boolean;
  children: ReactNode;
}

export function AppShell({ initialTheme, initialSidebarOpen, children }: AppShellProps) {
  const [theme, setTheme] = useState(initialTheme);
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const pathname = usePathname();

  useEffect(() => {
    document.cookie = `daybook_theme=${theme}; path=/; max-age=31536000`;
  }, [theme]);

  useEffect(() => {
    document.cookie = `daybook_sidebar=${sidebarOpen}; path=/; max-age=31536000`;
  }, [sidebarOpen]);

  const activeKey = NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.key ?? 'dashboard';

  return (
    <div data-theme={theme} style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <Sidebar
        items={NAV_ITEMS}
        activeKey={activeKey}
        open={sidebarOpen}
        onToggleOpen={() => setSidebarOpen((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <main className="pw-main" style={{ flex: 1, minWidth: 0, padding: 'var(--pw-top) 0 var(--pw-bottom)' }}>
        {children}
      </main>
      <BottomNav items={NAV_ITEMS} activeKey={activeKey} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/shell/app-shell.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the authenticated layout**

Create `app/(app)/layout.tsx`:
```tsx
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { verifySession } from '@/app/lib/dal';
import { AppShell } from '@/app/components/shell/app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  await verifySession();

  const store = await cookies();
  const theme = store.get('daybook_theme')?.value === 'light' ? 'light' : 'dark';
  const sidebarOpen = store.get('daybook_sidebar')?.value !== 'false';

  return (
    <AppShell initialTheme={theme} initialSidebarOpen={sidebarOpen}>
      {children}
    </AppShell>
  );
}
```

This file is an async Server Component that reads cookies and can redirect — it is thin glue over `verifySession` (already unit tested in Task 6) and `AppShell` (already unit tested above), so it is not independently unit tested; it's verified manually in Task 23's Step 3.

- [ ] **Step 6: Commit**

```bash
git add app/components/shell/app-shell.tsx app/components/shell/app-shell.test.tsx "app/(app)/layout.tsx"
git commit -m "feat: add AppShell and the authenticated route group layout"
```

---

## Task 23: Stub route pages and root redirect

**Files:**
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/(app)/tasks/page.tsx`
- Create: `app/(app)/calendar/page.tsx`
- Create: `app/(app)/matrix/page.tsx`
- Create: `app/(app)/habits/page.tsx`
- Create: `app/(app)/journal/page.tsx`
- Create: `app/page.tsx` (replaces the Create-Next-App default)
- Test: `app/(app)/stub-pages.test.tsx`

**Interfaces:**
- Consumes: `getSession` (Task 6).
- Produces: a fully navigable (if mostly placeholder) app — every Sidebar/BottomNav link in Task 20/21 now resolves to a real page.

- [ ] **Step 1: Write the failing test**

Create `app/(app)/stub-pages.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import DashboardPage from './dashboard/page';
import TasksPage from './tasks/page';
import CalendarPage from './calendar/page';
import MatrixPage from './matrix/page';
import HabitsPage from './habits/page';
import JournalPage from './journal/page';

const pages: Array<{ Component: () => React.JSX.Element; heading: string }> = [
  { Component: DashboardPage, heading: 'Dashboard' },
  { Component: TasksPage, heading: 'Tasks' },
  { Component: CalendarPage, heading: 'Calendar' },
  { Component: MatrixPage, heading: 'Matrix' },
  { Component: HabitsPage, heading: 'Habits' },
  { Component: JournalPage, heading: 'Journal' },
];

describe('stub route pages', () => {
  test.each(pages)('$heading page renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "app/(app)/stub-pages.test.tsx"`
Expected: FAIL — `Cannot find module './dashboard/page'`.

- [ ] **Step 3: Write the six stub pages**

Create `app/(app)/dashboard/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1440, padding: '0 clamp(16px, 3vw, 32px)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>Dashboard</h1>
      <p style={{ color: 'var(--text-muted)' }}>Coming in a later phase.</p>
    </div>
  );
}
```

Create `app/(app)/tasks/page.tsx`:
```tsx
export default function TasksPage() {
  return (
    <div style={{ maxWidth: 1440, padding: '0 clamp(16px, 3vw, 32px)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>Tasks</h1>
      <p style={{ color: 'var(--text-muted)' }}>Coming in a later phase.</p>
    </div>
  );
}
```

Create `app/(app)/calendar/page.tsx`:
```tsx
export default function CalendarPage() {
  return (
    <div style={{ maxWidth: 1440, padding: '0 clamp(16px, 3vw, 32px)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>Calendar</h1>
      <p style={{ color: 'var(--text-muted)' }}>Coming in a later phase.</p>
    </div>
  );
}
```

Create `app/(app)/matrix/page.tsx`:
```tsx
export default function MatrixPage() {
  return (
    <div style={{ maxWidth: 1440, padding: '0 clamp(16px, 3vw, 32px)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>Matrix</h1>
      <p style={{ color: 'var(--text-muted)' }}>Coming in a later phase.</p>
    </div>
  );
}
```

Create `app/(app)/habits/page.tsx`:
```tsx
export default function HabitsPage() {
  return (
    <div style={{ maxWidth: 1440, padding: '0 clamp(16px, 3vw, 32px)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>Habits</h1>
      <p style={{ color: 'var(--text-muted)' }}>Coming in a later phase.</p>
    </div>
  );
}
```

Create `app/(app)/journal/page.tsx`:
```tsx
export default function JournalPage() {
  return (
    <div style={{ maxWidth: 1440, padding: '0 clamp(16px, 3vw, 32px)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)' }}>Journal</h1>
      <p style={{ color: 'var(--text-muted)' }}>Coming in a later phase.</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "app/(app)/stub-pages.test.tsx"`
Expected: PASS (6 tests).

- [ ] **Step 5: Replace the root page with a session-based redirect**

Create `app/page.tsx` (overwrite the Create-Next-App default):
```tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/dal';

export default async function RootPage() {
  const session = await getSession();
  redirect(session ? '/dashboard' : '/login');
}
```

- [ ] **Step 6: Full manual walkthrough**

Run: `npm run dev`.
1. Visit `http://localhost:3000/` while logged out → redirected to `/login`.
2. Log in with your `.env` credentials → redirected to `/dashboard`, showing the sidebar (desktop) with "Today" highlighted... note the sidebar highlights "dashboard" as active for the `/dashboard` route (matches `NAV_ITEMS`'s `key: 'dashboard'`, `href: '/dashboard'`).
3. Click every sidebar item → each route renders its stub heading, the correct nav item highlights.
4. Resize the window below 860px → sidebar disappears, bottom nav appears with the same 6 items.
5. Click the theme toggle → background/text flip between dark and light.
6. Click the sidebar collapse toggle → sidebar narrows to icons-only.
7. Visit `/dashboard` directly in a new private/incognito window (no session) → redirected to `/login`.

- [ ] **Step 7: Run the full test suite one last time**

Run: `npm test`
Expected: every test across all 23 tasks passes.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)" app/page.tsx
git commit -m "feat: add stub route pages and session-based root redirect"
```

---

## Self-review notes

- **Spec coverage:** Auth/session/DAL/proxy (spec §2), Prisma schema exactly matching spec §3, design-system CSS + breakpoints (spec §2/§4 shell), all shared primitives named in spec §2's "shared UI primitives" list, and a fully navigable shell with stub pages for all 6 feature routes (spec §4.1–4.6, content deferred to their own phases per spec §6). Dashboard-as-landing-page (per the user's decision) is implemented via `app/page.tsx`'s redirect.
- **Deliberate deviations from the mockup, called out inline where they occur:** real Next.js routes/`next/link` instead of the mockup's single-page `activeView` state (Task 20/21/22); the sidebar's "Saved on this device" caption changed to "Synced to your account" (Task 20) since this build has a real backend, not `localStorage`; Dialog built with plain `div`s instead of a native `<dialog>` (Task 16) for reliable testability.
- **Type consistency check:** `SessionPayload` (Task 4) is used identically in Task 6 and Task 8. `SESSION_COOKIE_NAME` (Task 6) is the single source used by Task 7 and Task 8 — no duplicate cookie-name string literals anywhere. `NavItem`/`NAV_ITEMS` (Task 20) are the single source consumed by Task 21 and Task 22 — no duplicated nav lists. `IconName` (Task 11) is the type used by `NavItem.icon` (Task 20).
- **Not covered here (by design, deferred to later phase plans):** TaskList/Task/Habit/HabitLog/JournalEntry Server Actions and their screens — Task 3 only establishes the schema and client. The next plan (`Tasks` phase) picks up immediately on top of this foundation.

---

## Execution options

Plan complete and saved to `docs/superpowers/plans/2026-09-19-daybook-foundation.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
