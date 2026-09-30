// Wall-clock ↔ instant conversions in an IANA time zone, via Intl only.

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

function zonedParts(instant: Date, timeZone: string) {
  const parts: Record<string, number> = {};
  for (const p of partsFormatter(timeZone).formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return parts as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** How far the zone's wall clock is ahead of UTC at `instant`, in ms. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The instant at which the wall clock in `timeZone` reads `dateKey` +
 * `minutes` after midnight. In a DST gap the time is shifted forward by the
 * gap; in an overlap the earlier instant wins.
 */
export function zonedDateTimeToUtc(dateKey: string, minutes: number, timeZone: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d, 0, minutes);
  const DAY_MS = 86_400_000;
  // Offsets a day either side bracket any single DST transition near `wall`.
  const before = zoneOffsetMs(new Date(wall - DAY_MS), timeZone);
  const after = zoneOffsetMs(new Date(wall + DAY_MS), timeZone);
  const valid = [wall - before, wall - after].filter((t, i) => zoneOffsetMs(new Date(t), timeZone) === (i === 0 ? before : after));
  if (valid.length > 0) return new Date(Math.min(...valid));
  // Gap: read the wall time with the pre-transition offset, which lands just after the jump.
  return new Date(wall - before);
}

/** 'YYYY-MM-DD' of `instant` on the wall calendar of `timeZone`. */
export function zonedDateKey(instant: Date, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
