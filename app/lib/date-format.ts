function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayKey(): string {
  return localDateKey(new Date());
}

export function formatDueLabel(due: string | null, dueTime: number | null): string | null {
  if (!due) return null;
  const today = todayKey();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);
  let label = due === today ? 'Today' : due === tomorrow ? 'Tomorrow' : due.slice(5);
  if (dueTime != null) {
    const hours = Math.floor(dueTime / 60);
    const minutes = dueTime % 60;
    const period = hours < 12 ? 'AM' : 'PM';
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    label += ` ${hours12}:${String(minutes).padStart(2, '0')}${period}`;
  }
  return label;
}
