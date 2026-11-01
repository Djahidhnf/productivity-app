# Installable desktop app: design

Date: 2026-11-01
Status: awaiting review

## Goal

Make Klivr a good installed app on desktop, in its own window with a taskbar or dock icon, and make installing it easy to find.

Klivr already has `app/manifest.ts` and a push service worker (`public/sw.js`), so Chrome and Edge should already allow installing it from the address bar. This work adds the missing pieces around that.

## Scope

In scope:

- Complete the manifest (stable identity, app shortcuts).
- Register the service worker on every page.
- Show an offline screen when a page can't load.
- Add an Install button to the desktop sidebar.
- Make the title bar color follow the app theme.

Out of scope:

- Viewing or editing data offline. Pages and data are never cached.
- A wrapped desktop program (Tauri, Electron).
- Install instructions for browsers that don't fire `beforeinstallprompt`.
- Icon changes. The existing 192, 512 and maskable icons stay.

## Design

### 1. Manifest (`app/manifest.ts`)

Add:

- `id: '/dashboard'`. Browsers currently derive the app's identity from `start_url`, which is `/dashboard`, so this value keeps existing installs, including phones, as the same app.
- `scope: '/'`.
- `shortcuts` for Tasks (`/tasks`), Calendar (`/calendar`), Habits (`/habits`) and Notes (`/notes`), using the labels from `NAV_ITEMS`. Today is left out because `start_url` already opens it.

`start_url`, `display`, colors and `icons` don't change.

### 2. Service worker registration and install prompt

New client component `app/components/pwa-setup.tsx`, rendered from the root layout (`app/layout.tsx`) so it also runs on `/login`. It renders nothing. On mount it calls:

```ts
navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
```

It skips this when `serviceWorker` isn't in `navigator`, and it ignores registration failures because the app works without the worker. `enable()` in `notifications-button.tsx` keeps its own call to `register`, since registering the same worker again is harmless.

New module `app/lib/install-prompt.ts` holds the install state, and `pwa-setup.tsx` imports it:

- A listener attached when the module loads handles `beforeinstallprompt`. It calls `preventDefault()` and stores the event, so an event fired on `/login` is still available after sign-in.
- A listener on `appinstalled` clears the stored event.
- `useInstallPrompt()` is built on `useSyncExternalStore` and returns `{ canInstall, install }`. `install()` calls `prompt()`, then clears the stored event, because each event can only prompt once.
- The server snapshot is `canInstall: false`, so server and client render the same markup during hydration.

`preventDefault()` also suppresses Chrome's install mini-infobar on Android. Phones can still install from the browser menu. This is accepted, because the goal is an in-app desktop button.

### 3. Offline screen

New file `public/offline.html`:

- Self-contained, with inline styles and no external requests.
- Follows `prefers-color-scheme`, since cookies and app CSS aren't reliable here. Backgrounds use `#f8f9fb` (light) and `#0a0d10` (dark).
- Shows the Klivr name, a short "You're offline" message and a Retry button that calls `location.reload()`. A service worker fallback keeps the address the user asked for, so reloading retries that page.
- Contains no account data.

Changes to `public/sw.js`:

- Install: cache `/offline.html` in `klivr-offline-v1` inside `event.waitUntil`, then call `skipWaiting()`.
- Activate: delete any other cache whose name starts with `klivr-offline-`, then call `clients.claim()`.
- Fetch: for `request.mode === 'navigate'` only, respond with `fetch(request)` and fall back to the cached offline page if the fetch rejects. All other requests aren't intercepted, so they go straight to the network as they do today.
- Replace the "push-only" header comment, which would no longer be true.

The push and `notificationclick` handlers don't change, and existing push subscriptions survive the worker update.

Change to `proxy.ts`: add `offline\.html$` to the matcher exclusions. Without this, a signed-out visitor's worker would fetch the page, get the `/login` redirect, and cache the wrong thing.

Client-side navigations use `fetch` rather than `navigate` requests, so the handler doesn't see them directly. The expected behavior is that Next falls back to a full page load when one fails, which then reaches the offline page. This must be confirmed in manual testing. If it doesn't happen, the offline screen covers app launches and full page loads only, and the limitation gets reported rather than worked around with extra caching.

Saving while offline still fails the way it does today.

### 4. Install button

New client component `app/components/shell/install-button.tsx`:

- An `IconButton` labeled "Install Klivr" with a new `download` icon added to `app/components/icons.tsx`.
- Calls `install()` on click.
- Renders nothing when `canInstall` is false. That covers browsers without the event (Safari, Firefox), an app that's already installed, and running inside the installed window.

It goes first in `.pw-sidebar-actions` in `sidebar.tsx`, before the bell. The existing CSS already handles the collapsed sidebar by stacking these buttons, and the "Synced to your account" note already truncates when space is tight. The bottom nav doesn't get a button, since this feature is for desktop.

### 5. Title bar color

Use the same values as `--bg-app`, converted to hex: `#0a0d10` for dark and `#f8f9fb` for light.

- `app/layout.tsx`: replace the static `viewport` export with `generateViewport()`, which reads the `daybook_theme` cookie and returns `viewportFit: 'cover'` plus the matching `themeColor`. Dark is the default, matching the existing logic in the layout. This gives the right color on first paint.
- `app-shell.tsx`: the existing theme effect also updates the `content` of `meta[name="theme-color"]`, so toggling the theme updates the title bar immediately.

The manifest's `theme_color` stays as it is, because the page's meta tag takes over once a page has loaded.

## Error handling

| Situation | Behavior |
| --- | --- |
| Browser has no service worker support | `pwa-setup` does nothing and the app works as it does today |
| Service worker registration fails | Ignored, and the app keeps working without it |
| Offline page can't be cached during worker install | The new worker doesn't install, the previous one stays active, and the browser tries again on a later visit |
| User dismisses the install prompt | The event is cleared and the button hides until the browser fires a new event |
| Page load fails while offline | Offline page is shown, and Retry reloads the requested address |
| Page load gets an HTTP error from the server | The response passes through unchanged; only network failures show the offline page |

## Testing

Automated (existing component test setup):

- `install-button`: hidden with no event; appears after `beforeinstallprompt`; click calls `prompt()` and hides the button; hidden after `appinstalled`.
- `manifest`: `id`, `scope` and the four shortcut URLs are present, and each shortcut URL exists in `NAV_ITEMS`.
- `app-shell`: toggling the theme updates the `theme-color` meta tag.
- Existing shell, sidebar and notification tests still pass.

Manual, on a production build in Chrome or Edge:

- `/offline.html` returns 200 with no session cookie.
- The Install button appears, installs the app into its own window, and then disappears.
- Taskbar shortcuts open the right pages.
- Offline, launching the app shows the offline screen, and Retry loads the app once back online.
- Offline, clicking a sidebar link reaches the offline screen (see section 3).
- The title bar color is right on first paint in both themes and changes on toggle.
- A test push notification still arrives after the worker update.

## Rollout

Work happens on `feature/installable-desktop`. The unrelated uncommitted changes to `app/(app)/calendar/calendar-board.tsx` and `app/(app)/tasks/actions.ts` aren't part of this work and don't go in its commits. No database or environment variable changes are needed. Nothing merges or deploys without explicit approval.
