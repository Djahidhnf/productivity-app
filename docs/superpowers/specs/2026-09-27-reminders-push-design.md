# Reminders & push notifications — design

Date: 2026-09-27
Status: approved (Project B; Project A "Tasks & Matrix polish" is merged)

## Goals

1. Push-notification reminders for tasks with a due date, and for habits.
2. Per task / habit, the user picks when to be reminded: never, on time, 30 min before, 1 hour before, 1 day before, or custom.
3. Works on Android, desktop browsers, and iPhone/iPad (installed to the Home Screen).

## Decisions

- Hosting: Vercel (serverless). An external scheduler (cron-job.org, every minute) calls a protected dispatch endpoint. No in-process timers.
- Approach: compute-on-dispatch. Items store only their reminder settings; the dispatcher computes which reminders are due on each call and records sends in a log for idempotency. No pre-scheduled reminder rows.
- Devices: every device the user enables gets its own push subscription; each reminder goes to all of them.
- Untimed tasks (due date, no time) count from 09:00 local on the due date. Only "On the day (09:00)", "1 day before", "Custom (days)" and "Never" are offered for them.
- Tasks with no due date cannot have reminders.
- Habits get an optional time of day; the picker requires it. Daily habits remind every day; weekly habits remind only on user-picked weekdays. No reminder once the habit is logged for that day.
- Custom = a number plus a unit (minutes / hours / days) before the due time; days-only for untimed tasks.
- The user's time zone is captured from the browser when notifications are enabled and stored server-side; the server runs in UTC.

## Data model (Prisma)

- `Task.reminderOffset Int?` — minutes before due. `null` = never, `0` = on time.
  - Timed task: fire at `due date + dueTime` (local) − offset.
  - Untimed task: offset is a whole number of days × 1440; fire at 09:00 local on (due date − offset/1440 days). `0` = "On the day (09:00)".
- `Habit.time Int?` — minutes after local midnight.
- `Habit.reminderOffset Int?` — same meaning as on timed tasks; only effective when `time` is set.
- `Habit.reminderDays Int?` — 7-bit weekday mask, bit 0 = Monday … bit 6 = Sunday. Used for WEEKLY habits; ignored for DAILY.
- `PushSubscription` — `id`, `endpoint String @unique`, `p256dh String`, `auth String`, `userAgent String`, `createdAt`.
- `ReminderLog` — `id`, `kind` (`TASK` | `HABIT`), `itemId String`, `fireAt DateTime`, `sentAt DateTime @default(now())`; `@@unique([kind, itemId, fireAt])`. Rows older than 7 days are pruned on each dispatch.
- `AppSettings` — single row (`id = 'app'`), `timeZone String @default("UTC")`.

All new columns are nullable / defaulted; no backfill needed.

## Reminder computation (`app/lib/reminders/`)

Pure functions, no I/O:

- `zonedDateTimeToUtc(dateKey, minutes, timeZone): Date` — local wall time → UTC instant, via `Intl.DateTimeFormat` offset lookup (DST-safe, no date library).
- `taskFireAt(task, timeZone): Date | null` — null when no due date, no reminder, or done.
- `habitFireTimes(habit, windowStart, windowEnd, timeZone): { occurrence: dateKey, fireAt: Date }[]` — for each local day whose reminder can fall in the window (the occurrence day may be after the fire day for "1 day before"), respecting `startDate`, frequency and `reminderDays`.
- `dueReminders({ tasks, habits, habitLogs, now, timeZone }): Reminder[]` — everything with `fireAt` in `(now − 15 min, now]`, excluding done tasks and habits logged on their occurrence day. `Reminder` = `{ kind, itemId, fireAt, title, body, url }`.

Catch-up window: 15 minutes (`REMINDER_CATCH_UP_MS`). Older misses are dropped, not sent late.

## Dispatch

`POST /api/reminders/dispatch` (route handler):

1. Reject with 401 unless `Authorization: Bearer ${CRON_SECRET}` matches (constant-time compare). 500 if `CRON_SECRET` is unset.
2. Load `AppSettings.timeZone`; all tasks with `done = false`, `due` not null and `reminderOffset` not null; all habits with `time` and `reminderOffset` not null; and habit logs for dates from 1 day before `now` to the latest occurrence day any habit's offset can reach (single-user scale, so no finer pre-filtering).
3. `dueReminders(...)`, then drop ones already in `ReminderLog`.
4. For each reminder: insert the `ReminderLog` row first (unique constraint makes concurrent dispatches safe; a conflict means skip), then send to every `PushSubscription` with `web-push`. Delete subscriptions whose send returns 404 or 410. Other send errors are logged and do not fail the batch.
5. Prune `ReminderLog` rows older than 7 days.
6. Respond `{ sent, skipped, removedSubscriptions }`.

`/api` is already excluded from the auth proxy; the bearer secret is the only guard.

Notification payload (JSON to the service worker): `{ title, body, url, tag }`.
- Task: title = task text; body = "Due today at 2:00PM" / "Due tomorrow at 9:00AM" / "Due Oct 3 at 9:00AM" / "Due today" (untimed); times via `formatTime`, relative to the fire day in the stored time zone; url `/tasks`; tag `task-<id>`.
- Habit: title = "Time for <name>"; body = "7:30AM" (daily) or "7:30AM · 2 of 3 this week" (weekly; Monday-start week, logs counted before the occurrence day's own log); url `/habits`; tag `habit-<id>`.

## Subscribing (server actions, `app/lib/push/actions.ts`)

- `savePushSubscription({ endpoint, keys: { p256dh, auth }, userAgent, timeZone })` — `verifySession()`, upsert by endpoint, set `AppSettings.timeZone` (validated with `Intl.supportedValuesOf('timeZone')` / a try-construct of `Intl.DateTimeFormat`).
- `deletePushSubscription(endpoint)` — `verifySession()`, delete by endpoint (no error if missing).
- `sendTestNotification(endpoint)` — `verifySession()`, sends "Notifications are working" to that one subscription.

## PWA

- `app/manifest.ts`: name/short_name "Daybook", `display: 'standalone'`, `start_url: '/dashboard'`, theme/background colors from the Still palette, icons 192, 512, 512 maskable.
- Icons in `public/icons/` (generated simple "D" mark on the sage accent) plus `apple-touch-icon` (180px) via metadata in `app/layout.tsx`.
- `public/sw.js`: push-only service worker. `push` → `showNotification(title, { body, tag, data: { url }, icon, badge })`. `notificationclick` → focus an open client and navigate it to `url`, else `clients.openWindow(url)`. No fetch handler / offline caching.
- `next.config.ts` headers for `/sw.js`: `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, `Content-Security-Policy: default-src 'self'; script-src 'self'`.
- `proxy.ts` matcher also excludes `sw.js`, `manifest.webmanifest` and `icons/`, so they load without a session.
- Client env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Server env: `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:), `CRON_SECRET`. Added to `.env.example`.
- `npm run vapid-keys` script prints a new key pair (uses `web-push`'s `generateVAPIDKeys`).

## UI

### ReminderPicker (`app/components/ui/reminder-picker.tsx`)

Props: `value: number | null`, `onChange`, `mode: 'timed' | 'untimed' | 'disabled'`, `disabledHint?`.

| mode | options |
|---|---|
| timed | Never · On time · 30 min before · 1 hour before · 1 day before · Custom… |
| untimed | Never · On the day (09:00) · 1 day before · Custom… (days only) |
| disabled | Select disabled, hint shown |

Custom… reveals a number input (1–999) and a unit select (minutes / hours / days; days only in untimed mode). A value that doesn't match a preset renders as Custom with its number/unit decomposed (largest unit that divides evenly).

Used in:
- Task dialog: mode from the dialog's current due/dueTime ("Set a due date to get a reminder" when no date). When the date/time change makes the value invalid for the new mode (not a whole number of days in untimed mode), it resets to `0`.
- Habit dialog: new "Time" input (optional) and the picker (disabled with "Set a time to get a reminder" until time is set). WEEKLY habits also get a seven-toggle weekday row (M T W T F S S); at least one day must be on when a reminder is set.

Defaults: new tasks and habits → Never.

Cards: task cards and habit cards show a small bell icon when a reminder is set.

### Notifications dialog

A bell button opens a small dialog (the existing `Dialog` component) showing this device's state. The button appears in the sidebar footer next to the theme toggle, and in the Today page header (the sidebar is hidden below 860px, so this is the entry point on phones):

- Unsupported (no `serviceWorker` / `PushManager`): "This browser can't show push notifications."
- iOS not installed (iOS UA and not `display-mode: standalone`): "Add Daybook to your Home Screen (Share → Add to Home Screen), then open it from there to enable notifications."
- Blocked (`Notification.permission === 'denied'`): "Notifications are blocked. Allow them in your browser's site settings."
- Off: "Enable on this device" → register `/sw.js`, request permission, subscribe with the VAPID public key, call `savePushSubscription` with `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- On: "Send a test notification" and "Turn off on this device" (unsubscribe + `deletePushSubscription`).

Errors from any step show an inline message in the panel; the state is re-read after each action.

## Setup after deploy (documented in README)

1. `npm run vapid-keys`; put the keys, `VAPID_SUBJECT=mailto:<you>`, and a random `CRON_SECRET` into `.env` and Vercel env vars.
2. cron-job.org job: `POST https://<app>/api/reminders/dispatch` every minute, header `Authorization: Bearer <CRON_SECRET>`.
3. On each device: open the app (iPhone: from the Home Screen icon), bell → Enable.

## Testing

- Unit (`app/lib/reminders/*.test.ts`): `zonedDateTimeToUtc` incl. a DST transition (Europe/Paris) and Africa/Algiers; `taskFireAt` timed / untimed / custom days / no due / done; `habitFireTimes` daily, weekly with mask, before `startDate`, "1 day before" crossing days; `dueReminders` window edges (exactly 15 min old excluded, `now` included), logged habits skipped.
- Components: ReminderPicker options per mode, custom decomposition, onChange values; task dialog reset on mode change; habit dialog time + weekday toggles; notifications panel states with mocked `Notification`, `navigator.serviceWorker`, `PushManager`.
- Integration (DB, `web-push` mocked): subscription upsert/delete; dispatch 401 without/with wrong secret; sends once and the second call sends nothing; 410 removes the subscription; log pruning.
- Manual: test notification on desktop; phone after deploy.

## Out of scope

Snooze / notification action buttons, email or SMS, offline caching, a settings page, a configurable default time for untimed tasks (fixed 09:00), multiple users.
