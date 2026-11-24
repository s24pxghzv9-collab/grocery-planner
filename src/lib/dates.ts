// All dates are handled as local calendar days, stored as 'yyyy-mm-dd' strings.

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function todayISO(): string {
  return toISO(new Date());
}

/** Start of the week containing `iso`. */
export function weekStart(iso: string, weekStartsOn: number): string {
  const d = fromISO(iso);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(iso, -diff);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayName(iso: string): string {
  return DAY_NAMES[fromISO(iso).getDay()];
}
export function dayShort(iso: string): string {
  return DAY_SHORT[fromISO(iso).getDay()];
}
export function dayNum(iso: string): number {
  return fromISO(iso).getDate();
}
export function shortDate(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export function rangeLabel(start: string): string {
  const end = addDays(start, 6);
  const s = fromISO(start);
  const e = fromISO(end);
  if (s.getMonth() === e.getMonth()) return `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]}`;
  return `${shortDate(start)} – ${shortDate(end)}`;
}

/** "This week", "Next week", "Last week" or a date range. */
export function weekLabel(start: string, currentStart: string): string {
  if (start === currentStart) return 'This week';
  if (start === addDays(currentStart, 7)) return 'Next week';
  if (start === addDays(currentStart, -7)) return 'Last week';
  return rangeLabel(start);
}
