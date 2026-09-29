# Klivr Design System

The design language and component library for **Klivr** — a software development agency that builds production software and embeds senior engineers with product teams, from first prototype to scaled release.

This system gives any agent (or developer) everything needed to produce on-brand Klivr interfaces, decks, and marketing assets: color, type, spacing, iconography, reusable components, and full-screen UI kits.

> **Namespace:** components are exposed at `window.KlivrDesignSystem_3b3219.<Name>` in card/kit HTML after loading `_ds_bundle.js`.

---

## Sources

- `uploads/klivr logo.png` — the provided primary logo (white wordmark + geometric "K" mark on #171717). Processed into transparent, recolored variants and an app icon in `assets/`.
- Brand direction from the brief: modern, clean, professional; light **and** dark mode; rounded edges; clean modern icons. Signature dark `#171717`, accent lime `#C6FF34`.

No codebase or Figma file was provided. The product UIs in `ui_kits/` are **representative recreations** built from the brand direction — replace copy/data with real Klivr content when available.

---

## Brand at a glance

- **Who:** Klivr — a dev agency. Software solutions + dev services (product builds, staff augmentation, platform/infra work).
- **Personality:** sharp, technical, confident, low-ceremony. Engineers who ship. Not loud, not corporate.
- **Signature look:** near-black `#171717` surfaces, a single electric-lime accent, generous rounding, Space Grotesk headlines over Geist body, JetBrains Mono for anything code-adjacent.

---

## Content fundamentals (voice & tone)

How Klivr writes:

- **Confident and concise.** Short, declarative sentences. Lead with the outcome. "Software, shipped sharp." "Ship faster." Cut filler words.
- **Builder-to-builder.** Talks to technical and product audiences as peers. Comfortable with engineering vocabulary (deploy, pipeline, staging, retainer, staff aug) without over-explaining.
- **"We" build, "you" ship.** First-person plural for Klivr ("We embed senior engineers…"); second person for the client ("Your team ships on day one"). Avoid the passive corporate voice.
- **Casing:** Sentence case for almost everything — headings, buttons, labels. Reserve UPPERCASE only for tiny mono eyebrows/labels (tracked out, e.g. `WHAT WE DO`). Never Title Case full sentences.
- **Punchy headlines, plain body.** Display lines run 2–5 words. Body copy is plain and useful — no marketing fluff, no exclamation overload.
- **Numbers earn their place.** Use concrete metrics (41s deploys, 38 points shipped, +12%) only when real and relevant — never decorative stat-slop.
- **Emoji:** none. The brand voice carries no emoji. Use the Lucide icon set instead.
- **Tone examples:**
  - CTA: "Start a project" / "Book a build sprint" (not "Get started today!!")
  - Empty state: "No deploys yet. Push to `main` to see them here."
  - Error: "Build failed — 3 type errors in checkout.ts." (specific, calm, actionable)

---

## Visual foundations

**Color.** A single accent — lime `#C6FF34` — against a near-true-gray neutral ramp. Lime is used sparingly and with intent: primary buttons, the active indicator, focus rings, key data points, the logo mark on dark. It is never a background wash. Dark mode is the brand's home (`#171717` surfaces on a `#0F0F0F` canvas); light mode is fully supported (white surfaces on `#F7F7F6`). Text on lime is always near-black `#171717`, never white. Status hues (green/amber/red/blue) are muted and used only for state. See `tokens/colors.css`.

**Type.** `Space Grotesk` for display & headings (tight tracking, bold) — technical and distinctive. `Geist` for body and UI — clean, neutral, highly legible. `JetBrains Mono` for code, eyebrows, tags, and numeric metadata. Display sizes run large and tight; body stays at a comfortable 16/1.5. See `tokens/typography.css`.

**Spacing & layout.** 4px base grid. Comfortable, breathing layouts — generous padding inside cards (24px), clear section rhythm. Containers cap around 1280–1440px. See `tokens/spacing.css`.

**Corner radius.** Rounded is core. Controls use 12px, cards/panels 28px, pills are fully round. Nothing is sharp-cornered. See the *Corner Radii* specimen card.

**Backgrounds.** Flat solid surfaces — no busy gradients, no stock-photo washes, no hand-drawn illustration. The only "gradient" permitted is the soft accent **glow** behind a focal CTA or accent card (`--glow-accent`). Optional subtle dotted/grid texture or a faint lime radial bloom on dark hero sections — low opacity, never busy.

**Elevation.** Light mode leans on soft, layered drop shadows (`--shadow-sm`…`--shadow-xl`). Dark mode leans on **borders** plus tighter, darker shadows — surfaces separate by 1px hairlines and a faint lift rather than heavy glows. The accent glow is reserved for emphasis.

**Borders.** 1px hairlines everywhere (`--border`); `--border-strong` for inputs/interactive edges; lime border only to signal focus or an accent card.

**Motion.** Quick and crisp. Hover/state changes at 120ms, larger transitions 200–320ms. Default easing is a smooth ease-out (`--ease-out`); toggles, dialogs and dots use a gentle spring (`--ease-spring`) for a tactile pop. No infinite decorative loops on content.

**Interaction states.**
- *Hover:* primary buttons brighten to `--accent-hover` and gain a soft glow; neutral surfaces shift one step (`surface → surface-2/3`); ghost items get a subtle fill.
- *Press:* controls scale down slightly (`scale(0.98)`, icon buttons `0.92`) — never a color jump alone.
- *Focus:* a 3px lime focus ring (`--ring`) on `:focus-visible`. Always visible, never removed.
- *Disabled:* 50–55% opacity, pointer-events off.

**Transparency & blur.** Sparingly: modal overlays use a 55% dark scrim + small blur (`--blur-sm`); sticky bars may use a translucent surface + blur. Not decorative.

**Imagery.** When photography appears, prefer cool, slightly desaturated, high-contrast tech imagery (workspaces, screens, abstract geometry) — never warm/saturated stock. Keep it behind/around content with a scrim, never directly under text. Most surfaces are imagery-free.

**Cards.** Rounded 28px, 1px border (or shadow when raised), flat surface, generous padding. Interactive cards lift 2px and strengthen their border on hover. One accent card per view, max.

---

## Iconography

- **Set:** [**Lucide**](https://lucide.dev) — the chosen icon system. Clean, modern, consistent 24px grid, rounded line caps/joins, ~2px stroke. It matches the brief ("clean modern icons, rounded edges") exactly.
- **Substitution note:** no icon asset was supplied with the brand, so Lucide is a **substitution** picked for fit. If Klivr has its own icon set, drop the SVGs into `assets/icons/` and swap the CDN reference. *Flag for the user.*
- **Delivery:** loaded from CDN — `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>`, then `<i data-lucide="rocket"></i>` and `lucide.createIcons()`. In React, the `lucide-react` package exposes the same icons as components.
- **Style rules:** single stroke weight, never mix filled and outline, color via `currentColor` (inherits text color; lime only when the icon *is* the accent). Default 1–1.25em sizing inline with text. ~16–20px in UI controls.
- **Emoji & unicode:** never used as iconography. Lucide covers all glyph needs.

---

## Assets (`assets/`)

| File | Use |
|---|---|
| `klivr-logo-white.png` | Wordmark for dark surfaces |
| `klivr-logo-dark.png` | Wordmark for light surfaces |
| `klivr-logo-accent.png` | Lime wordmark (special use) |
| `klivr-mark-accent.png` | "K" mark, lime — for #171717 tiles |
| `klivr-mark-white.png` / `klivr-mark-dark.png` | Mono "K" mark |
| `klivr-app-icon.png` | Rounded app tile (lime mark on #171717) |

Logos were keyed to transparency and recolored from the original upload. Keep clear space around the wordmark ≥ the height of the "K" bar.

---

## Index / manifest

**Foundations (root):**
- `styles.css` — global entry point; consumers link this one file.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`.
- `guidelines/*.card.html` — foundation specimen cards (Type, Colors, Spacing, Brand) shown in the Design System tab.

**Components (`components/`)** — exposed under `window.KlivrDesignSystem_3b3219`:
- `forms/` — Button, IconButton, Input, Select, Switch, Checkbox, Radio
- `data-display/` — Card, Badge, Tag, Avatar
- `navigation/` — Tabs
- `feedback/` — Tooltip, Dialog, Toast

Each component directory has `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, and one `*.card.html` demo.

**UI kits (`ui_kits/`):**
- `marketing/` — Klivr agency website (hero, services, work, CTA).
- `dashboard/` — Klivr client project dashboard (projects, deploys, activity).

**Other:**
- `SKILL.md` — portable Agent Skill manifest.
- `assets/` — logos & marks.

---

## Using the system

Link the stylesheet and load the bundle:

```html
<link rel="stylesheet" href="styles.css" />
<script src="_ds_bundle.js"></script>
<script>const { Button, Card, Badge } = window.KlivrDesignSystem_3b3219;</script>
```

Set the theme by adding `data-theme="dark"` or `data-theme="light"` (or the `.dark` / `.light` class) to a container or `<html>`. Light is the default. To follow the OS preference, reflect it onto the root in one line:

```js
document.documentElement.dataset.theme =
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
```

All color, type, spacing and effect tokens are CSS custom properties — reference them directly (`var(--accent)`, `var(--surface)`, `var(--radius-2xl)`).

**Fonts** are loaded via Google Fonts CDN (`tokens/fonts.css`). Space Grotesk, Geist and JetBrains Mono are all real Google Fonts — no substitution. To self-host, drop `.woff2` files in `assets/fonts/` and replace the `@import`s with `@font-face` rules.
