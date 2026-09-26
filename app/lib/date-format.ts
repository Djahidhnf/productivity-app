export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayKey(): string {
  return localDateKey(new Date());
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours < 12 ? 'AM' : 'PM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${String(mins).padStart(2, '0')}${period}`;
}

export function formatDueLabel(due: string | null, dueTime: number | null): string | null {
  if (!due) return null;
  const today = todayKey();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);
  let label = due === today ? 'Today' : due === tomorrow ? 'Tomorrow' : due.slice(5);
  if (dueTime != null) {
    label += ` ${formatTime(dueTime)}`;
  }
  return label;
}

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
