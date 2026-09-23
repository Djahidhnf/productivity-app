# Mobile-Responsive UI, Sidebar Removal & Calendar Swipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Daybook usable on phones without layout breakage, remove the sidebar at every width (bottom tab bar becomes the only nav), compact the Week and Year calendar views for phones, and let users swipe horizontally to change days in the Day / 3-day / Week views.

**Architecture:** The shell drops `Sidebar` and all theme/sidebar state; `BottomNav` becomes visible at every width with a capped inner container, and the `--pw-bottom` reserve applies everywhere. Swipe is a small self-contained hook (`useSwipe`) built from two pure functions (`lockAxis`, `resolveSwipe`) plus pointer handlers that drive a `--swipe-x` CSS variable on the grid container; `DayWeekGrid` wires it up and `CalendarBoard` feeds it the same `handlePrev` / `handleNext` the header arrows use. Compact Week/Year are CSS-class driven (media queries in `app/styles/layout.css`).

**Tech Stack:** Next.js 16.3.5 App Router (React 19.2, React Compiler enabled via `reactCompiler: true`), plain CSS in `app/styles/layout.css` (not Tailwind utilities), Vitest 5 + React Testing Library + jsdom 30.

**Spec:** `docs/superpowers/specs/2026-09-23-mobile-responsive-swipe-design.md`

## Global Constraints

- Navigation is the bottom tab bar only, at all widths. Its inner container is capped at `max-width: 720px` and centered; the bar itself spans the full width and keeps `env(safe-area-inset-bottom)` padding.
- Theme toggle is removed with no replacement. The theme still comes from the `daybook_theme` cookie, read server-side in `app/layout.tsx` and set on `<html data-theme>`. `AppShell` must not set `data-theme` or write cookies.
- Swipe applies to Day, 3-day and Week views only. Month, Year and Agenda get no swipe.
- Swipe goes through the same `handlePrev` / `handleNext` the header arrows use (1, 3 or 7 days). Swipe left = next, swipe right = previous.
- Swipe is touch only (`pointerType === 'touch'`); mouse drags must do nothing.
- Axis lock at 10px; commit if travel is > 25% of grid width, or > 40px and > 0.5px/ms; slide animation is 150ms; `prefers-reduced-motion` disables the animation.
- Week view on phones (below 560px): all 7 columns stay visible; time gutter is 40px; tapping a block opens the task dialog.
- Year view: 4 columns above 860px, 3 columns at 860px and below with tighter gap/padding. No swipe.
- Do not touch `app/(app)/dashboard/` (Dashboard phase is deferred; the stub page stays).
- Do not touch the untracked `Personal productivity webapp/` directory.
- Next.js in this repo has breaking changes vs. older versions. The `viewport` export API was verified against `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md` (`export const viewport: Viewport = { viewportFit: 'cover' }`, Server Components only).
- React Compiler is on: do not read or write `ref.current` during render (only inside event handlers/effects); update "latest callback" refs in an effect.
- Every commit message ends with these two trailer lines, verbatim, separated from the body by a blank line:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
  ```
- Test command pattern: `npx vitest run "<path>"`. Full suite: `npm test`. Never claim a check passed without running it and reading the output.

---

## Task 1: Remove the sidebar; bottom nav everywhere

**Files:**
- Modify: `app/components/shell/app-shell.tsx` (full rewrite)
- Modify: `app/components/shell/app-shell.test.tsx` (full rewrite)
- Modify: `app/components/shell/bottom-nav.tsx`
- Modify: `app/components/shell/bottom-nav.test.tsx`
- Modify: `app/(app)/layout.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/styles/layout.css` (lines 8-14, 23, 46-61 — see Step 6)
- Delete: `app/components/shell/sidebar.tsx`, `app/components/shell/sidebar.test.tsx`

**Interfaces:**
- Produces: `AppShell({ children }: { children: ReactNode })` — no other props. CSS classes `.pw-shell`, `.pw-main`, `.pw-bottomnav-inner`. `--pw-bottom` is now `calc(76px + env(safe-area-inset-bottom, 0px))` at all widths.
- Consumes: `NAV_ITEMS` from `./nav-items` (unchanged), `BottomNav({ items, activeKey })` (unchanged props).

- [ ] **Step 1: Rewrite the AppShell test (fails against the current sidebar shell)**

Replace the whole contents of `app/components/shell/app-shell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { AppShell } from '@/app/components/shell/app-shell';
import { NAV_ITEMS } from '@/app/components/shell/nav-items';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/tasks',
}));

describe('AppShell', () => {
  test('renders children inside <main>', () => {
    const { container } = render(
      <AppShell>
        <p>dashboard content</p>
      </AppShell>
    );
    expect(container.querySelector('main')).toContainElement(screen.getByText('dashboard content'));
  });

  test('has no sidebar and no theme or sidebar toggle buttons', () => {
    const { container } = render(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(container.querySelector('aside')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Toggle theme' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Toggle sidebar' })).toBeNull();
  });

  test('renders the bottom nav with exactly one link per nav item', () => {
    render(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toHaveAttribute('href', item.href);
    }
  });

  test('marks the Tasks nav item active based on the current pathname', () => {
    render(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    expect(screen.getByRole('link', { name: /Tasks/ }).style.color).toBe('var(--accent)');
  });
});
```

Also add this test inside the existing `describe('BottomNav', ...)` block in `app/components/shell/bottom-nav.test.tsx`, after the existing test:

```tsx
  test('wraps the links in a centered, width-capped inner container', () => {
    const { container } = render(<BottomNav items={NAV_ITEMS} activeKey="habits" />);
    const inner = container.querySelector('.pw-bottomnav-inner');
    expect(inner).not.toBeNull();
    expect(inner?.querySelectorAll('a')).toHaveLength(NAV_ITEMS.length);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "app/components/shell/app-shell.test.tsx" "app/components/shell/bottom-nav.test.tsx"`
Expected: FAIL — the "no sidebar" test fails (an `<aside>` exists), the "exactly one link per nav item" / "Tasks active" tests fail with "Found multiple elements" (sidebar + bottom nav both render links), and the bottom-nav inner-container test fails (`.pw-bottomnav-inner` is null).

- [ ] **Step 3: Rewrite `app/components/shell/app-shell.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from './bottom-nav';
import { NAV_ITEMS } from './nav-items';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const activeKey = NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.key ?? 'dashboard';

  return (
    <div className="pw-shell">
      <main className="pw-main" style={{ padding: 'var(--pw-top) 0 var(--pw-bottom)' }}>
        {children}
      </main>
      <BottomNav items={NAV_ITEMS} activeKey={activeKey} />
    </div>
  );
}
```

- [ ] **Step 4: Update `BottomNav` to use a capped inner container**

In `app/components/shell/bottom-nav.tsx`, replace the returned JSX (the whole `return ( ... );`) with:

```tsx
  return (
    <nav
      className="pw-bottomnav"
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '6px 4px calc(6px + env(safe-area-inset-bottom, 0px))', zIndex: 20 }}
    >
      <div className="pw-bottomnav-inner">
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
      </div>
    </nav>
  );
```

- [ ] **Step 5: Simplify the (app) layout, delete the sidebar files, add the viewport export**

Replace all of `app/(app)/layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { verifySession } from '@/app/lib/dal';
import { AppShell } from '@/app/components/shell/app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  await verifySession();

  return <AppShell>{children}</AppShell>;
}
```

Delete the sidebar:

```bash
git rm app/components/shell/sidebar.tsx app/components/shell/sidebar.test.tsx
```

In `app/layout.tsx`, change the import line and add the `viewport` export right after `metadata` (needed so `env(safe-area-inset-*)` works on notched phones):

```tsx
import type { Metadata, Viewport } from "next";
```

```tsx
export const viewport: Viewport = {
  viewportFit: "cover",
};
```

- [ ] **Step 6: Update `app/styles/layout.css`**

Make these edits (line numbers are from the file before this task):

1. Replace lines 8-14 (the `:root` block, `.pw-bottomnav { display: none; }` and the `.pw-cal-scroll` rule — `.pw-cal-scroll` is unused anywhere, verified with grep) with:

```css
:root {
  --pw-top: 28px;
  --pw-bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  --pw-vh: calc(100dvh - var(--pw-top) - var(--pw-bottom));
}
.pw-shell { display: flex; min-height: 100dvh; padding-inline: env(safe-area-inset-left, 0px) env(safe-area-inset-right, 0px); overflow-x: clip; background: var(--bg); color: var(--text-primary); font-family: var(--font-sans); }
.pw-main { flex: 1; min-width: 0; max-width: 1440px; margin: 0 auto; }
.pw-bottomnav-inner { display: flex; width: 100%; max-width: 720px; margin: 0 auto; }
```

2. On the `.pw-viewpill` rule (line 23) change `bottom: 22px;` to `bottom: calc(84px + env(safe-area-inset-bottom, 0px));` (the nav is now always present).

3. In the `@media (max-width: 860px)` block (lines 46-61): change `:root { --pw-top: 18px; --pw-bottom: 76px; }` to `:root { --pw-top: 18px; }`; delete the `.pw-sidebar { display: none; }` and `.pw-bottomnav { display: flex; }` lines; and replace the `.pw-viewpill { bottom: calc(84px + env(safe-area-inset-bottom)); max-width: calc(100vw - 20px); overflow-x: auto; justify-content: flex-start; }` line with `.pw-viewpill { max-width: calc(100vw - 20px); overflow-x: auto; justify-content: flex-start; }`.

- [ ] **Step 7: Run the tests, type-check and lint**

Run: `npx vitest run "app/components/shell"` — Expected: PASS (app-shell 4 tests, bottom-nav 2 tests).
Run: `npx tsc --noEmit` — Expected: no errors (nothing imports `Sidebar` or passes `initialTheme` / `initialSidebarOpen` any more).
Run: `npm run lint` — Expected: no new errors.
Run: `npm test` — Expected: whole unit suite PASS.

- [ ] **Step 8: Verify the viewport meta tag is emitted**

Run `npm run dev` in the background, then:
`curl -s http://localhost:3000/login | grep -o '<meta name="viewport"[^>]*>'`
Expected: a tag whose `content` contains `viewport-fit=cover`. Stop the dev server afterwards.

- [ ] **Step 9: Commit**

```bash
git add app/components/shell app/layout.tsx "app/(app)/layout.tsx" app/styles/layout.css
git commit -m "$(cat <<'EOF'
feat: remove sidebar, use the bottom nav at every width

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

---

## Task 2: Compact year view

**Files:**
- Modify: `app/(app)/calendar/year-view.tsx` (lines 23-52 — the outer div, month card and month button)
- Modify: `app/(app)/calendar/year-view.test.tsx` (append a `describe`)
- Modify: `app/styles/layout.css` (append year-view rules; extend the 860px media block)

**Interfaces:**
- Produces: CSS classes `.pw-yearview` (grid), `.pw-yearview-card`, `.pw-yearview-label`. Component props are unchanged.

- [ ] **Step 1: Write the failing test**

Append to `app/(app)/calendar/year-view.test.tsx`:

```tsx
describe('YearView responsive hooks', () => {
  test('uses the year-view classes so CSS can compact the grid on phones', () => {
    const { container } = render(<YearView months={makeMonths()} tasksByDate={() => []} onMonthOpen={vi.fn()} todayKey="2026-09-23" />);
    expect(container.querySelector('.pw-yearview')).not.toBeNull();
    expect(container.querySelectorAll('.pw-yearview-card')).toHaveLength(12);
    expect(container.querySelectorAll('.pw-yearview-label')).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "app/(app)/calendar/year-view.test.tsx"`
Expected: FAIL — `.pw-yearview` is null.

- [ ] **Step 3: Move the grid/card/label styles into classes**

In `app/(app)/calendar/year-view.tsx`, replace the block from `return (` through the closing `</button>` of the month label (lines 23-52) with:

```tsx
  return (
    <div className="pw-yearview">
      {months.map((m) => (
        <div key={`${m.year}-${m.month}`} className="pw-yearview-card">
          <button type="button" className="pw-yearview-label" onClick={() => onMonthOpen(m.year, m.month)}>
            {m.label}
          </button>
```

Everything after that (the weekday-initial grid and day cells, and the closing tags) stays exactly as it is.

- [ ] **Step 4: Add the CSS**

Append to the end of `app/styles/layout.css`:

```css
.pw-yearview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-4); padding: 0 clamp(16px, 3vw, 32px) 24px; overflow-y: auto; flex: 1; min-height: 0; }
.pw-yearview-card { border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 8px; }
.pw-yearview-label { background: none; border: none; cursor: pointer; font-family: var(--font-display); font-weight: var(--weight-semibold); font-size: var(--text-sm); padding: 0; margin-bottom: 4px; }
@media (max-width: 860px) {
  .pw-yearview { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); padding: 0 16px 24px; }
  .pw-yearview-card { padding: 6px; border-radius: var(--radius-md); }
  .pw-yearview-label { font-size: var(--text-xs); }
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run "app/(app)/calendar/year-view.test.tsx"` — Expected: all PASS (existing 4+ tests and the new one; jsdom does not evaluate media queries, so column counts are checked visually in Task 5).
Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/calendar/year-view.tsx" "app/(app)/calendar/year-view.test.tsx" app/styles/layout.css
git commit -m "$(cat <<'EOF'
feat: compact the calendar year view on phones (3 columns, tighter spacing)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

---

## Task 3: `useSwipe` hook

**Files:**
- Create: `app/lib/use-swipe.ts`
- Create: `app/lib/use-swipe.test.tsx`

**Interfaces:**
- Produces (from `@/app/lib/use-swipe`):
  - `lockAxis(dx: number, dy: number): 'x' | 'y' | null`
  - `resolveSwipe(input: { dx: number; dy: number; dt: number; width: number }): 'next' | 'prev' | 'cancel' | 'vertical'`
  - constants `AXIS_LOCK_PX = 10`, `COMMIT_RATIO = 0.25`, `FLING_MIN_DISTANCE_PX = 40`, `FLING_MIN_VELOCITY = 0.5`, `SLIDE_MS = 150`
  - `useSwipe({ onSwipeLeft?, onSwipeRight? }): { ref: RefObject<HTMLDivElement | null>; handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture } }`
- Behavior contract: with no callbacks supplied, the handlers do nothing at all. While a horizontal drag is in progress the hook sets `--swipe-x` (px) on `ref.current.style` and clears `data-swipe`; animated moves set `data-swipe="anim"`. Swipe left calls `onSwipeLeft` (= "next"); swipe right calls `onSwipeRight` (= "prev").

- [ ] **Step 1: Write the failing tests**

Create `app/lib/use-swipe.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSwipe, lockAxis, resolveSwipe, SLIDE_MS } from '@/app/lib/use-swipe';

describe('lockAxis', () => {
  test('stays undecided until movement reaches 10px', () => {
    expect(lockAxis(5, 5)).toBeNull();
    expect(lockAxis(9, 0)).toBeNull();
  });
  test('locks horizontal or vertical by the dominant direction', () => {
    expect(lockAxis(12, 3)).toBe('x');
    expect(lockAxis(-12, 3)).toBe('x');
    expect(lockAxis(3, -12)).toBe('y');
  });
  test('a tie favors vertical so scrolling wins', () => {
    expect(lockAxis(10, 10)).toBe('y');
  });
});

describe('resolveSwipe', () => {
  const width = 400;
  test('commits past 25% of the width (left = next, right = prev)', () => {
    expect(resolveSwipe({ dx: -150, dy: 5, dt: 400, width })).toBe('next');
    expect(resolveSwipe({ dx: 150, dy: 5, dt: 400, width })).toBe('prev');
  });
  test('exactly 25% does not commit when slow', () => {
    expect(resolveSwipe({ dx: -100, dy: 0, dt: 1000, width })).toBe('cancel');
  });
  test('a short slow drag cancels', () => {
    expect(resolveSwipe({ dx: -60, dy: 0, dt: 400, width })).toBe('cancel');
  });
  test('a short fast fling commits', () => {
    expect(resolveSwipe({ dx: -60, dy: 0, dt: 80, width })).toBe('next');
  });
  test('a fast but tiny flick (under 40px) cancels', () => {
    expect(resolveSwipe({ dx: -30, dy: 0, dt: 20, width })).toBe('cancel');
  });
  test('vertical-dominant gestures resolve to vertical', () => {
    expect(resolveSwipe({ dx: -100, dy: -150, dt: 300, width })).toBe('vertical');
  });
  test('a zero duration does not divide by zero', () => {
    expect(resolveSwipe({ dx: -60, dy: 0, dt: 0, width })).toBe('next');
  });
});

function Harness(props: { onLeft?: () => void; onRight?: () => void; onInnerClick?: () => void }) {
  const { ref, handlers } = useSwipe({ onSwipeLeft: props.onLeft, onSwipeRight: props.onRight });
  return (
    <div ref={ref} data-testid="surface" {...handlers}>
      <button onClick={props.onInnerClick}>inner</button>
    </div>
  );
}

let nowMs = 0;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  nowMs = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function getSurface(): HTMLElement {
  const el = screen.getByTestId('surface');
  Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true });
  return el;
}

function pointer(x: number, y: number, pointerType = 'touch', pointerId = 1) {
  return { pointerId, pointerType, clientX: x, clientY: y };
}

function drag(el: HTMLElement, { dx, dy = 0, ms = 400, pointerType = 'touch' }: { dx: number; dy?: number; ms?: number; pointerType?: string }) {
  fireEvent.pointerDown(el, pointer(200, 300, pointerType));
  nowMs += ms / 2;
  fireEvent.pointerMove(el, pointer(200 + dx / 2, 300 + dy / 2, pointerType));
  nowMs += ms / 2;
  fireEvent.pointerMove(el, pointer(200 + dx, 300 + dy, pointerType));
  fireEvent.pointerUp(el, pointer(200 + dx, 300 + dy, pointerType));
}

describe('useSwipe', () => {
  test('columns follow the finger while dragging horizontally', () => {
    render(<Harness onLeft={vi.fn()} />);
    const el = getSurface();
    fireEvent.pointerDown(el, pointer(200, 300));
    fireEvent.pointerMove(el, pointer(140, 302));
    expect(el.style.getPropertyValue('--swipe-x')).toBe('-60px');
    expect(el.dataset.swipe).toBeUndefined();
  });

  test('a left swipe past the threshold calls onSwipeLeft after the slide-out', () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    render(<Harness onLeft={onLeft} onRight={onRight} />);
    const el = getSurface();
    drag(el, { dx: -150 });
    expect(el.dataset.swipe).toBe('anim');
    expect(el.style.getPropertyValue('--swipe-x')).toBe('-400px');
    expect(onLeft).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onLeft).toHaveBeenCalledTimes(1);
    expect(onRight).not.toHaveBeenCalled();
  });

  test('a right swipe past the threshold calls onSwipeRight', () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    render(<Harness onLeft={onLeft} onRight={onRight} />);
    drag(getSurface(), { dx: 150 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onRight).toHaveBeenCalledTimes(1);
    expect(onLeft).not.toHaveBeenCalled();
  });

  test('after the swipe the new content slides back to rest', () => {
    render(<Harness onLeft={vi.fn()} />);
    const el = getSurface();
    drag(el, { dx: -150 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(el.style.getPropertyValue('--swipe-x')).toBe('400px');
    vi.advanceTimersByTime(60);
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
    expect(el.dataset.swipe).toBe('anim');
  });

  test('a short slow drag cancels and snaps back', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    drag(el, { dx: -40, ms: 800 });
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
  });

  test('a short fast fling commits', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    drag(getSurface(), { dx: -60, ms: 80 });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(onLeft).toHaveBeenCalledTimes(1);
  });

  test('a vertical gesture is ignored and never moves the columns', () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    render(<Harness onLeft={onLeft} onRight={onRight} />);
    const el = getSurface();
    drag(el, { dx: 5, dy: 200 });
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
    expect(onRight).not.toHaveBeenCalled();
    expect(el.style.getPropertyValue('--swipe-x')).toBe('');
  });

  test('mouse drags are ignored', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    drag(el, { dx: -200, pointerType: 'mouse' });
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
    expect(el.style.getPropertyValue('--swipe-x')).toBe('');
  });

  test('with no callbacks supplied nothing happens', () => {
    render(<Harness />);
    const el = getSurface();
    drag(el, { dx: -200 });
    expect(el.style.getPropertyValue('--swipe-x')).toBe('');
  });

  test('the click that follows a swipe is swallowed, but a plain tap click is not', () => {
    const onInnerClick = vi.fn();
    render(<Harness onLeft={vi.fn()} onInnerClick={onInnerClick} />);
    const el = getSurface();
    drag(el, { dx: -150 });
    fireEvent.click(screen.getByText('inner'));
    expect(onInnerClick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    fireEvent.click(screen.getByText('inner'));
    expect(onInnerClick).toHaveBeenCalledTimes(1);
  });

  test('pointercancel (the browser took over for scrolling) snaps back without navigating', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    fireEvent.pointerDown(el, pointer(200, 300));
    fireEvent.pointerMove(el, pointer(120, 300));
    fireEvent.pointerCancel(el, pointer(120, 300));
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
  });

  test('a second finger cancels the swipe', () => {
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    fireEvent.pointerDown(el, pointer(200, 300, 'touch', 1));
    fireEvent.pointerMove(el, pointer(100, 300, 'touch', 1));
    fireEvent.pointerDown(el, pointer(50, 300, 'touch', 2));
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
    fireEvent.pointerUp(el, pointer(100, 300, 'touch', 1));
    vi.advanceTimersByTime(1000);
    expect(onLeft).not.toHaveBeenCalled();
  });

  test('with prefers-reduced-motion the callback fires immediately with no slide', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const onLeft = vi.fn();
    render(<Harness onLeft={onLeft} />);
    const el = getSurface();
    drag(el, { dx: -150 });
    expect(onLeft).toHaveBeenCalledTimes(1);
    expect(el.style.getPropertyValue('--swipe-x')).toBe('0px');
    expect(el.dataset.swipe).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run "app/lib/use-swipe.test.tsx"`
Expected: FAIL — cannot resolve `@/app/lib/use-swipe` (module does not exist yet).

- [ ] **Step 3: Implement `app/lib/use-swipe.ts`**

```ts
'use client';

import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

export type SwipeResult = 'next' | 'prev' | 'cancel' | 'vertical';

export const AXIS_LOCK_PX = 10;
export const COMMIT_RATIO = 0.25;
export const FLING_MIN_DISTANCE_PX = 40;
export const FLING_MIN_VELOCITY = 0.5; // px per ms
export const SLIDE_MS = 150;
const SETTLE_DELAY_MS = 30;
const CLICK_SWALLOW_MS = 50;

export function lockAxis(dx: number, dy: number): 'x' | 'y' | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}

export function resolveSwipe({ dx, dy, dt, width }: { dx: number; dy: number; dt: number; width: number }): SwipeResult {
  const absX = Math.abs(dx);
  if (Math.abs(dy) > absX) return 'vertical';
  const farEnough = absX > width * COMMIT_RATIO;
  const fastEnough = absX > FLING_MIN_DISTANCE_PX && absX / Math.max(dt, 1) > FLING_MIN_VELOCITY;
  if (!farEnough && !fastEnough) return 'cancel';
  return dx < 0 ? 'next' : 'prev';
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  startT: number;
  axis: 'x' | 'y' | null;
}

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe({ onSwipeLeft, onSwipeRight }: UseSwipeOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSwipeLeft, onSwipeRight });
  const gesture = useRef<Gesture | null>(null);
  const busy = useRef(false);
  const suppressClick = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    callbacks.current = { onSwipeLeft, onSwipeRight };
  });

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function setOffset(px: number, animated: boolean) {
    const el = ref.current;
    if (!el) return;
    if (animated) el.dataset.swipe = 'anim';
    else delete el.dataset.swipe;
    el.style.setProperty('--swipe-x', `${px}px`);
  }

  function finish(direction: 'next' | 'prev') {
    const el = ref.current;
    if (!el) return;
    const fire = () => {
      if (direction === 'next') callbacks.current.onSwipeLeft?.();
      else callbacks.current.onSwipeRight?.();
    };
    if (prefersReducedMotion()) {
      setOffset(0, false);
      fire();
      return;
    }
    const width = el.clientWidth || 1;
    const out = direction === 'next' ? -width : width;
    busy.current = true;
    setOffset(out, true);
    later(() => {
      // Jump the (now off-screen) columns to the opposite side, swap the
      // date, then slide the new days in from there.
      setOffset(-out, false);
      fire();
      later(() => {
        setOffset(0, true);
        later(() => {
          busy.current = false;
        }, SLIDE_MS);
      }, SETTLE_DELAY_MS);
    }, SLIDE_MS);
  }

  function swallowNextClick() {
    suppressClick.current = true;
    later(() => {
      suppressClick.current = false;
    }, CLICK_SWALLOW_MS);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch' || busy.current) return;
    if (!callbacks.current.onSwipeLeft && !callbacks.current.onSwipeRight) return;
    if (gesture.current) {
      // A second finger: abandon the swipe.
      if (gesture.current.axis === 'x') setOffset(0, true);
      gesture.current = null;
      return;
    }
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startT: performance.now(),
      axis: null,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId || g.axis === 'y') return;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    if (g.axis === null) {
      g.axis = lockAxis(dx, dy);
      if (g.axis === 'x') event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    if (g.axis === 'x') setOffset(dx, false);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    gesture.current = null;
    if (g.axis !== 'x') return;
    swallowNextClick();
    const result = resolveSwipe({
      dx: event.clientX - g.startX,
      dy: event.clientY - g.startY,
      dt: performance.now() - g.startT,
      width: ref.current?.clientWidth || 1,
    });
    if (result === 'next' || result === 'prev') finish(result);
    else setOffset(0, true);
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    gesture.current = null;
    if (g.axis === 'x') setOffset(0, true);
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.stopPropagation();
    event.preventDefault();
  }

  return { ref, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture } };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run "app/lib/use-swipe.test.tsx"`
Expected: all PASS. If pointer coordinates/`pointerType` seem to be dropped (e.g. "columns follow the finger" gets `''`), jsdom is not constructing a `PointerEvent` — check that `typeof PointerEvent !== 'undefined'` in the test environment before changing the hook; do not weaken the tests.
Run: `npx tsc --noEmit && npm run lint` — Expected: no errors (in particular no React Compiler ref-during-render lint errors).

- [ ] **Step 5: Commit**

```bash
git add app/lib/use-swipe.ts app/lib/use-swipe.test.tsx
git commit -m "$(cat <<'EOF'
feat: add useSwipe hook for horizontal touch swipes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

---

## Task 4: Swipe in Day / 3-day / Week grids + compact week

**Files:**
- Modify: `app/(app)/calendar/day-week-grid.tsx` (full rewrite)
- Modify: `app/(app)/calendar/day-week-grid.test.tsx` (line 2 import; append a `describe`)
- Modify: `app/(app)/calendar/calendar-task-block.tsx` (root div className; wrap the check toggle)
- Modify: `app/(app)/calendar/calendar-board.tsx` (lines 265-274, the `<DayWeekGrid ... />` call)
- Modify: `app/(app)/calendar/calendar-board.test.tsx` (append a `describe`)
- Modify: `app/styles/layout.css` (replace the `.pw-calgrid*` block at the end of the pre-Task-2 file; append compact rules)

**Interfaces:**
- Consumes: `useSwipe` from `@/app/lib/use-swipe` (Task 3).
- Produces: `DayWeekGridProps` gains `onSwipePrev?: () => void` and `onSwipeNext?: () => void`. The grid root gets `data-dense="true"` when it shows more than 3 date keys. CSS classes `.pw-swipe-follow`, `.pw-calgrid-hour`, `.pw-calgrid-allday-label`, `.pw-cal-block`, `.pw-cal-block-check`.

- [ ] **Step 1: Write the failing grid tests**

In `app/(app)/calendar/day-week-grid.test.tsx` change line 2 to:

```tsx
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
```

and append at the end of the file:

```tsx
describe('DayWeekGrid swipe and density', () => {
  beforeEach(() => {
    // Reduced motion: swipe callbacks fire immediately instead of after the slide.
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderGrid(props: { dateKeys?: string[]; onSwipePrev?: () => void; onSwipeNext?: () => void }) {
    const { container } = render(
      <DayWeekGrid
        dateKeys={props.dateKeys ?? ['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={noop}
        onTaskDragStart={noop}
        onGridDrop={noop}
        onSwipePrev={props.onSwipePrev}
        onSwipeNext={props.onSwipeNext}
      />
    );
    const grid = container.querySelector('.pw-calgrid') as HTMLElement;
    Object.defineProperty(grid, 'clientWidth', { value: 400, configurable: true });
    return grid;
  }

  function swipe(grid: HTMLElement, dx: number) {
    const at = (x: number) => ({ pointerId: 1, pointerType: 'touch', clientX: x, clientY: 300 });
    fireEvent.pointerDown(grid, at(200));
    fireEvent.pointerMove(grid, at(200 + dx / 2));
    fireEvent.pointerMove(grid, at(200 + dx));
    fireEvent.pointerUp(grid, at(200 + dx));
  }

  test('swiping left calls onSwipeNext', () => {
    const onSwipeNext = vi.fn();
    const onSwipePrev = vi.fn();
    swipe(renderGrid({ onSwipeNext, onSwipePrev }), -200);
    expect(onSwipeNext).toHaveBeenCalledTimes(1);
    expect(onSwipePrev).not.toHaveBeenCalled();
  });

  test('swiping right calls onSwipePrev', () => {
    const onSwipeNext = vi.fn();
    const onSwipePrev = vi.fn();
    swipe(renderGrid({ onSwipeNext, onSwipePrev }), 200);
    expect(onSwipePrev).toHaveBeenCalledTimes(1);
    expect(onSwipeNext).not.toHaveBeenCalled();
  });

  test('without swipe callbacks a swipe does nothing', () => {
    const grid = renderGrid({});
    swipe(grid, -200);
    expect(grid.style.getPropertyValue('--swipe-x')).toBe('');
  });

  test('a swipe does not fire onGridClick (the trailing click is swallowed)', () => {
    const onGridClick = vi.fn();
    const { container } = render(
      <DayWeekGrid
        dateKeys={['2026-09-23']}
        timedTasksFor={emptyList}
        untimedTasksFor={emptyList}
        onTaskOpen={noop}
        onGridClick={onGridClick}
        onTaskDragStart={noop}
        onGridDrop={noop}
        onSwipeNext={vi.fn()}
        onSwipePrev={vi.fn()}
      />
    );
    const grid = container.querySelector('.pw-calgrid') as HTMLElement;
    Object.defineProperty(grid, 'clientWidth', { value: 400, configurable: true });
    swipe(grid, -200);
    fireEvent.click(container.querySelector('[data-daykey="2026-09-23"]') as HTMLElement);
    expect(onGridClick).not.toHaveBeenCalled();
  });

  test('marks grids showing more than 3 days as dense (week) and others as not', () => {
    const week = renderGrid({ dateKeys: ['1', '2', '3', '4', '5', '6', '7'].map((d) => `2026-09-2${d}`) });
    expect(week.getAttribute('data-dense')).toBe('true');
    cleanup();
    const day = renderGrid({});
    expect(day.getAttribute('data-dense')).toBe('false');
  });
});
```

Also add `cleanup` to the first import of that file: `import { render, screen, fireEvent, cleanup } from '@testing-library/react';`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run "app/(app)/calendar/day-week-grid.test.tsx"`
Expected: the new swipe tests FAIL (callbacks never fire; `data-dense` is null); the pre-existing tests still PASS.

- [ ] **Step 3: Rewrite `app/(app)/calendar/day-week-grid.tsx`**

```tsx
'use client';

import { CalendarTaskBlock } from './calendar-task-block';
import { HOUR_PX, minutesFromOffset } from './calendar-views';
import { useSwipe } from '@/app/lib/use-swipe';
import type { TaskDTO } from './queries';

export interface DayWeekGridProps {
  dateKeys: string[];
  timedTasksFor: (dateKey: string) => TaskDTO[];
  untimedTasksFor: (dateKey: string) => TaskDTO[];
  onTaskOpen: (task: TaskDTO) => void;
  onGridClick: (dateKey: string, minutes: number) => void;
  onTaskDragStart: (task: TaskDTO) => void;
  onGridDrop: (dateKey: string, minutes: number) => void;
  onTaskToggleDone?: (taskId: string) => void;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function dayHeaderParts(dateKey: string): { weekday: string; dayNum: string } {
  const d = new Date(`${dateKey}T00:00:00`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: String(d.getDate()),
  };
}

export function DayWeekGrid({
  dateKeys,
  timedTasksFor,
  untimedTasksFor,
  onTaskOpen,
  onGridClick,
  onTaskDragStart,
  onGridDrop,
  onTaskToggleDone,
  onSwipePrev,
  onSwipeNext,
}: DayWeekGridProps) {
  const { ref, handlers } = useSwipe({ onSwipeLeft: onSwipeNext, onSwipeRight: onSwipePrev });

  return (
    <div ref={ref} className="pw-calgrid pw-scroll" data-dense={dateKeys.length > 3} {...handlers}>
      <div className="pw-calgrid-header">
        <div className="pw-calgrid-gutter" />
        {dateKeys.map((key) => {
          const { weekday, dayNum } = dayHeaderParts(key);
          return (
            <div key={key} className="pw-swipe-follow" style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '8px 4px' }}>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {weekday}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)' }}>{dayNum}</div>
            </div>
          );
        })}
      </div>
      <div className="pw-calgrid-allday">
        <div className="pw-calgrid-gutter pw-calgrid-allday-label">All day</div>
        {dateKeys.map((key) => (
          <div
            key={key}
            className="pw-swipe-follow"
            style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border)', padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {untimedTasksFor(key).map((task) => (
              <div
                key={task.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onTaskOpen(task);
                }}
                style={{
                  fontSize: 'var(--text-2xs)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textDecoration: task.done ? 'line-through' : 'none',
                }}
              >
                {task.text}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="pw-calgrid-body" style={{ height: HOUR_PX * 24 }}>
        <div className="pw-calgrid-gutter">
          {HOURS.map((h) => (
            <div key={h} style={{ height: HOUR_PX, position: 'relative' }}>
              {h > 0 && <span className="pw-calgrid-hour">{h}:00</span>}
            </div>
          ))}
        </div>
        {dateKeys.map((key) => (
          <div
            key={key}
            className="pw-calgrid-col"
            data-daykey={key}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const minutes = minutesFromOffset(event.clientY - rect.top, 30);
              onGridClick(key, minutes);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const minutes = minutesFromOffset(event.clientY - rect.top, 15);
              onGridDrop(key, minutes);
            }}
          >
            {HOURS.map((h) => (
              <div key={h} className="pw-calgrid-hourline" style={{ top: h * HOUR_PX }} />
            ))}
            {timedTasksFor(key).map((task) => (
              <CalendarTaskBlock
                key={task.id}
                task={task}
                onOpen={onTaskOpen}
                onToggleDone={onTaskToggleDone}
                draggable
                onDragStart={() => onTaskDragStart(task)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add class hooks to `CalendarTaskBlock`**

In `app/(app)/calendar/calendar-task-block.tsx`:

1. On the root `<div` (the one with `draggable={draggable}`), add `className="pw-cal-block"` as its first attribute.
2. Replace the check-toggle block
```tsx
      {onToggleDone && (
        <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} />
      )}
```
with
```tsx
      {onToggleDone && (
        <span className="pw-cal-block-check">
          <CheckToggle checked={task.done} onToggle={() => onToggleDone(task.id)} label={task.text} />
        </span>
      )}
```

- [ ] **Step 5: Update `app/styles/layout.css`**

Replace the whole existing `.pw-calgrid*` block (the seven rules from `.pw-calgrid {` through `.pw-calgrid-allday {`; Task 2's year-view rules were appended after it, so leave those where they are) with:

```css
.pw-calgrid { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; touch-action: pan-y pinch-zoom; border-top: 1px solid var(--border); }
.pw-calgrid-header { position: sticky; top: 0; z-index: 3; display: flex; background: var(--surface); border-bottom: 1px solid var(--border); }
.pw-calgrid-gutter { flex: none; width: 56px; position: sticky; left: 0; background: var(--surface); z-index: 2; }
.pw-calgrid-col { flex: 1; min-width: 0; border-left: 1px solid var(--border); position: relative; }
.pw-calgrid-body { display: flex; position: relative; }
.pw-calgrid-hourline { position: absolute; left: 0; right: 0; border-top: 1px solid var(--border); pointer-events: none; }
.pw-calgrid-allday { display: flex; border-bottom: 1px solid var(--border); flex: none; }
.pw-calgrid-allday-label { display: flex; align-items: center; font-size: var(--text-2xs); color: var(--text-muted); padding-left: 4px; }
.pw-calgrid-hour { position: absolute; top: -7px; right: 8px; font-size: var(--text-2xs); color: var(--text-faint); font-family: var(--font-mono); }
.pw-calgrid-col, .pw-swipe-follow { transform: translateX(var(--swipe-x)); }
.pw-calgrid[data-swipe="anim"] .pw-calgrid-col, .pw-calgrid[data-swipe="anim"] .pw-swipe-follow { transition: transform 150ms var(--ease-out); }
@media (prefers-reduced-motion: reduce) {
  .pw-calgrid[data-swipe="anim"] .pw-calgrid-col, .pw-calgrid[data-swipe="anim"] .pw-swipe-follow { transition: none; }
}
@media (max-width: 560px) {
  .pw-calgrid-gutter { width: 40px; }
  .pw-calgrid-hour { right: 4px; font-size: 9px; }
  .pw-calgrid-allday-label { font-size: 9px; padding-left: 2px; white-space: nowrap; overflow: hidden; }
  .pw-calgrid[data-dense="true"] .pw-cal-block { padding: 1px 3px !important; font-size: 10px !important; }
  .pw-calgrid[data-dense="true"] .pw-cal-block-check { display: none; }
}
```

Note: `translateX(var(--swipe-x))` with `--swipe-x` unset is invalid at computed-value time, so `transform` falls back to `none` — columns are untransformed until the first swipe. `overflow-x: hidden` on `.pw-calgrid` stops a rightward drag from creating a horizontal scrollbar; the sticky time gutter (z-index 2, opaque background) covers the columns as they slide under it.

- [ ] **Step 6: Wire `CalendarBoard` and add board tests**

In `app/(app)/calendar/calendar-board.tsx`, add two props to the `<DayWeekGrid` element (after `onTaskToggleDone={handleToggleDone}`):

```tsx
          onSwipePrev={handlePrev}
          onSwipeNext={handleNext}
```

Append to the end of `app/(app)/calendar/calendar-board.test.tsx` (the file's top-level `beforeEach` already pins the date to Wednesday Sep 23 2026, and its `matchMedia` mock reports `matches: false`, so the animated path runs and the tests wait ~150ms via `findBy*`):

```tsx
describe('CalendarBoard swipe navigation', () => {
  function swipeGrid(container: HTMLElement, dx: number) {
    const grid = container.querySelector('.pw-calgrid') as HTMLElement;
    Object.defineProperty(grid, 'clientWidth', { value: 400, configurable: true });
    const at = (x: number) => ({ pointerId: 1, pointerType: 'touch', clientX: x, clientY: 300 });
    fireEvent.pointerDown(grid, at(200));
    fireEvent.pointerMove(grid, at(200 + dx / 2));
    fireEvent.pointerMove(grid, at(200 + dx));
    fireEvent.pointerUp(grid, at(200 + dx));
  }

  test('swiping left in Day view moves to tomorrow; swiping right moves back', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, -200);
    expect(await screen.findByText('Tomorrow')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400)); // let the slide-in finish
    swipeGrid(container, 200);
    await waitFor(() => expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument());
  }, 10000);

  test('swiping right in Day view moves to yesterday', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, 200);
    expect(await screen.findByText('Yesterday')).toBeInTheDocument();
  }, 10000);

  test('swiping left in 3-Day view advances by 3 days', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: '3-Day' }));
    expect(screen.getByText('Sep 23 – Sep 25')).toBeInTheDocument();
    swipeGrid(container, -200);
    expect(await screen.findByText('Sep 26 – Sep 28')).toBeInTheDocument();
  }, 10000);

  test('swiping left in Week view advances by 7 days', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Week' }));
    expect(screen.getByText('Sep 20 – Sep 26')).toBeInTheDocument();
    swipeGrid(container, -200);
    expect(await screen.findByText('Sep 27 – Oct 3')).toBeInTheDocument();
  }, 10000);

  test('a short swipe below the threshold does not change the date', async () => {
    const { container } = render(<CalendarBoard initialTasks={[]} lists={lists} />);
    swipeGrid(container, -20);
    expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument();
  }, 10000);
});
```

- [ ] **Step 7: Run everything**

Run: `npx vitest run "app/(app)/calendar"` — Expected: all PASS (grid, board, task-block, year-view, etc.).
Run: `npx tsc --noEmit && npm run lint` — Expected: no errors.
Run: `npm test` — Expected: whole unit suite PASS.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/calendar" app/styles/layout.css
git commit -m "$(cat <<'EOF'
feat: swipe to change days in the calendar Day/3-Day/Week views, compact week on phones

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

---

## Task 5: Responsive audit, fixes, and final verification

**Files:**
- Modify: `app/components/ui/dialog.tsx` (line 48)
- Modify: `app/styles/layout.css` and/or individual page components — only for defects the audit actually finds.

**Interfaces:**
- Consumes: everything above. Produces: no new interfaces.

- [ ] **Step 1: Apply the one known fix**

In `app/components/ui/dialog.tsx` change `maxHeight: '90vh',` to `maxHeight: '90dvh',` so the dialog is not taller than the visible viewport when a mobile browser's URL bar is showing. Change nothing else in that file.

- [ ] **Step 2: Start the app and log in**

Run `npm run dev` in the background (needs the project's `.env` with the database and auth variables). Open `http://localhost:3000` and log in. If the app cannot run locally (missing DB/env), stop and report that the visual audit could not be done — do not claim it passed.

- [ ] **Step 3: Audit every page at 360px, 390px and 768px**

Use the browser's device emulation (touch enabled, so `pointerType` is `touch`) or any available browser-automation tool. Pages: `/tasks`, `/calendar` (all six views), `/matrix`, `/habits`, `/journal`, `/dashboard` (stub only — do not build it), `/login` (log out first). For each page and width, in the console run:

```js
(() => {
  const w = innerWidth;
  const overflowingPage = document.documentElement.scrollWidth > w + 1;
  const offenders = [...document.querySelectorAll('body *')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && !e.closest('.pw-board, .pw-viewpill, .pw-scroll'); })
    .slice(0, 15)
    .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} right=${Math.round(e.getBoundingClientRect().right)}`);
  return { overflowingPage, offenders };
})()
```

Expected: `overflowingPage: false` and `offenders: []`. Also check by eye, on each page and width:
1. The bottom tab bar is visible, centered/capped on wide screens, and does not cover the last content (scroll to the bottom).
2. On `/calendar` the floating view pill sits above the tab bar and does not cover the header buttons.
3. Opening a task dialog fits the screen, scrolls internally, and Save/Delete are reachable.
4. Nothing is clipped, overlapping or unreadable (task cards, quadrants, habit heatmap, journal editor and history).

Record each defect found (page, width, what breaks).

- [ ] **Step 4: Fix each defect minimally**

For every defect from Step 3: make the smallest CSS change (prefer `app/styles/layout.css` media queries following the existing `.pw-*` conventions, or a small style tweak in the offending component), re-run the console check at that width, and confirm the defect is gone. Do not rewrite pages that already lay out correctly. Add a regression unit test only where the defect was in component logic; pure-CSS fixes are verified in the browser.

- [ ] **Step 5: Verify the swipe and compact views by hand (touch emulation at 390px)**

On `/calendar`:
1. Day view: drag horizontally past ~100px → columns follow the finger, slide out, new day slides in; title changes Today → Tomorrow. Drag right → Yesterday.
2. 3-Day view: a swipe moves the title by 3 days; Week view moves it by 7.
3. A slow short drag (< 25% width) springs back; a quick flick commits.
4. Dragging vertically scrolls the 24-hour grid without changing the date; scroll position is preserved after a swipe.
5. Tapping an empty grid area still opens "New task"; tapping a block opens the task; a swipe never opens "New task".
6. Week view at 360px: 7 columns readable, 40px time gutter with `23:00` labels not clipped, blocks show truncated single-line text.
7. Year view at 390px: 3 columns, day numbers readable, tapping a month opens Month view.
8. Desktop width (1280px): mouse drags on the grid do nothing; header arrows still work; year view has 4 columns.

Known trade-off to report (not a bug): in the 7-column Week view below 560px the per-block "done" checkbox is hidden; tasks can still be completed from Day/3-Day view or the Tasks page.

- [ ] **Step 6: Full verification**

Stop the dev server, then run each and read the output:
- `npm test` — Expected: all unit tests PASS.
- `npm run lint` — Expected: no errors.
- `npx tsc --noEmit` — Expected: no errors.
- `npm run build` — Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A app
git commit -m "$(cat <<'EOF'
fix: mobile responsive audit fixes (dialog height, layout defects)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GJocTJckJo6znKDAW4Jg2L
EOF
)"
```

If the audit found no defects beyond the dialog height, the commit contains only that change.
