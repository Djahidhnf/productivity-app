# Still — design system

A calm, near-monochrome design system for focus and productivity apps. Its job is to get out of the way: show the one thing that matters, keep everything else quiet, and replace words with glyphs wherever the meaning is obvious.

**Name.** "Still" is a working name chosen for this system (the brief did not name a brand). Rename freely.

**Sources.** Built from a written brief only — no codebase, Figma, logo, or screenshots were provided:
> clean, minimal and modern design that helps focus and productivity … monochromic colors with low saturation … limit extra actions, replace actions with icons like "add" → "+" … clean and clear to read font.

**Products represented.** One: the *Still* desktop web app (tasks + focus timer) — see `ui_kits/app/`. It is an original reference design, not a recreation.

---

## Index

- `styles.css` — entry point; `@import`s only.
- `tokens/` — `fonts.css`, `colors.css` (scales + semantic, light & `[data-theme="dark"]`), `typography.css`, `spacing.css` (space, radius, control heights, layout), `elevation.css`, `motion.css`, `base.css` (resets, selection, focus-visible, links).
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `components/` — React primitives, each with `.jsx`, `.d.ts`, `.prompt.md`, plus one card per folder.
- `ui_kits/app/` — interactive Still app (Today, Upcoming, Inbox, Project, Focus, Settings).
- `thumbnail.html` — project tile. `SKILL.md` — Agent Skill wrapper.
- `assets/` — none. No logo exists; the wordmark is plain type (see Brand).

## Components

- **core/** — `Icon`, `Button`, `IconButton`
- **forms/** — `Input`, `Select`, `Checkbox`, `Radio`, `Switch`
- **display/** — `Card`, `Badge`, `Tag`, `ProgressRing`
- **navigation/** — `Tabs`
- **feedback/** — `Dialog`, `Toast`, `Tooltip`

Intentional additions beyond the standard set: `Icon` (Lucide wrapper so icons are one prop everywhere), `ProgressRing` (the focus timer is the product's centrepiece).

---

## Content fundamentals

- **Say less.** Every string is as short as it can be while staying clear. Headings are one word where possible: *Today*, *Upcoming*, *Inbox*, *Settings*.
- **Icons over verbs.** "+" not "Add task". ▶ not "Start". × not "Close". Words appear only when an icon would be ambiguous (Delete, Create, Focus) — and then one word.
- **Second person, implied.** Address the user as *you* only when needed; usually drop the pronoun entirely ("Take five.", "Nothing left for today."). Never *we*/*our*.
- **Calm, not cheerful.** No exclamation marks, no celebration, no gamified praise. Completion is acknowledged, not applauded: *Task completed* · *Session complete. Take five.*
- **Sentence case** for everything — titles, buttons, menu items. The only uppercase is the 11px section label (PROJECTS) with 0.06em tracking.
- **Placeholders ask, they don't instruct:** *What needs doing?*, *Search*, *Name* — never "Enter a …".
- **Numbers are data**: mono and tabular — `3 left`, `25m`, `24:59`. Durations abbreviate (`25m`, `1h 40m`); dates are relative first (*Today*, *Tomorrow*, *Mon 28*).
- **Destructive copy states the consequence**: *Delete project?* / *Its 12 tasks will be removed too.*
- **Undo over confirm.** Prefer a Toast with *Undo* to a confirmation dialog.
- **No emoji.** Not in UI, not in empty states, not in notifications.

## Visual foundations

- **Color.** ~95% of pixels come from a 15-step cool graphite scale with chroma ≤ 0.012 (oklch, hue 250). One accent — muted **sage** (hue 165, chroma ≈ 0.045) — used only for: checked state, progress, the focus/start action, focus rings. Status colors (moss, amber, clay, mist) are equally desaturated and appear as small dots or soft badges, never as large fills. Primary buttons are **ink** (gray-900 / gray-100 in dark), not accent. Build with semantic tokens (`--surface-*`, `--fg-*`, `--border-*`, `--accent*`), never raw scale values.
- **Dark mode.** `[data-theme="dark"]` swaps semantic aliases. Never pure black (bg is gray-950, 15.5% L) and never pure white text (gray-100) — both reduce glare.
- **Type.** Geist for everything; Geist Mono for timers, counts, shortcuts. Three weights (400/500/600). Body is 15/1.5, measure 62ch. Headings 600 with −0.01 to −0.02em tracking. Display 88px mono, −0.035em, only for the focus clock.
- **Spacing.** 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 96. Generous vertical whitespace; lists breathe (44px rows). Content column max 680px, centered, 56px top padding.
- **Backgrounds.** Flat solid surfaces only. No gradients, images, textures, patterns or illustrations. The app bg (`--bg-app`) is a hair off-white; the sidebar is one step darker (`--surface-2`); content sits on `--bg-app` directly without a card.
- **Borders.** 1px hairlines in three strengths (`--border-1` dividers, `--border-2` controls, `--border-strong` checkboxes). Borders do the separation work that shadows do elsewhere. No colored or left-accent borders.
- **Shadows.** Almost none. `--shadow-1` for a lifted segmented tab / raised card; `--shadow-overlay` for dialogs and toasts only.
- **Corner radii.** 4 (kbd), 6 (tags, tabs, nav items), 8 (controls), 12 (cards, toasts), 16 (dialogs), full (badges, round buttons). Soft, never bubbly.
- **Cards.** White surface, 1px `--border-1`, 12px radius, no shadow by default. Use sparingly — whitespace is the primary grouping device. Never nest.
- **Hover.** Background shifts one step (`--surface-hover`); ghost icons go from `--fg-2` to `--fg-1`. Secondary actions on rows (▶ focus) are hidden until row hover.
- **Press.** Scale to 0.98 (buttons) / 0.94 (icon buttons), 120ms. No color flash.
- **Focus.** Sage border + 3px soft ring (`--ring`). Always visible on keyboard focus.
- **Motion.** Quiet. Fades and ≤2px shifts, `cubic-bezier(.2,.8,.2,1)`. 120ms hover, 180ms toggles, 280ms panels, 600ms progress. No bounces, no springs, no confetti. Respects `prefers-reduced-motion`.
- **Transparency & blur.** Only the dialog overlay: graphite at 28% with 6px backdrop blur. Nothing else is translucent.
- **Imagery.** None by default. If imagery is ever needed, it should be desaturated, cool, soft-grain — matching the palette.
- **Layout.** Fixed 232px sidebar + scrolling centered content. Focus mode removes all chrome: just the ring, the time and three controls.
- **Density.** Controls 28/34/40px; hit targets ≥ 32px desktop (44px list rows).

## Iconography

- **Set:** [Lucide](https://lucide.dev) outline icons, v0.460.0, loaded from unpkg CDN by the `Icon` component (`<Icon name="plus" />`). No icon font, no sprites, no PNGs are bundled.
- **Style:** 24px grid, 1.75 stroke (matches Geist's weight), round caps/joins, `currentColor`. Sizes: 15 (sm controls), 16 (md / list), 18 (default), 20 (large). No filled icons, no duotone.
- **Usage:** icons replace action words — `plus` add, `check` done, `x` close/remove, `play`/`pause` focus, `search`, `more-horizontal` overflow, `settings`. Nav uses `sun` Today, `calendar` Upcoming, `inbox` Inbox. Projects use a 7–8px colored square, not an icon.
- **Every icon-only button** has an `aria-label` and, unless universally obvious, a `Tooltip` with its keyboard shortcut.
- **Unicode** is used only for keyboard glyphs in shortcuts (⌘ ↵ Esc). **No emoji.**
- Substitution flag: Lucide was chosen (no brand icon set was provided). Swap the CDN URL in `components/core/Icon.jsx` if a custom set arrives.

## Brand

No logo was supplied, and none was drawn. Wherever a mark is needed, set **still** in Geist 600, lowercase, −0.04em tracking.

## Fonts

Geist and Geist Mono are loaded from Google Fonts (`tokens/fonts.css`). Self-hosted `.woff2` files are not included — drop them into `assets/fonts/` and replace the `@import` with `@font-face` rules for offline/production use.
