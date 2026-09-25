import type { DateKey } from './types';

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const pad = (n: number) => String(n).padStart(2, '0');

export function keyOf(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateOf(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function todayKey(now = new Date()): DateKey {
  return keyOf(now);
}

export function addDays(k: DateKey, n: number): DateKey {
  const d = dateOf(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

/** Whole days from a to b (b − a). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86400000);
}

/** Monday = 0 … Sunday = 6. */
export function weekdayOf(k: DateKey): number {
  return (dateOf(k).getDay() + 6) % 7;
}

/** First day of the week containing k. */
export function weekStartOf(k: DateKey, weekStart: 'Monday' | 'Sunday' = 'Monday'): DateKey {
  const wd = weekdayOf(k);
  const off = weekStart === 'Monday' ? wd : (wd + 1) % 7;
  return addDays(k, -off);
}

export function shortD(k: DateKey): string {
  const d = dateOf(k);
  return MON[d.getMonth()] + ' ' + d.getDate();
}

export function longD(k: DateKey, today: DateKey): string {
  if (k === today) return 'Today';
  if (k === addDays(today, -1)) return 'Yesterday';
  return DOW[weekdayOf(k)] + ', ' + shortD(k);
}

/** Inclusive range of keys from a to b. */
export function range(a: DateKey, b: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = a; k <= b; k = addDays(k, 1)) out.push(k);
  return out;
}

export function hhmm(d: Date): string {
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export function dayOfYear(k: DateKey): number {
  const d = dateOf(k);
  return diffDays(keyOf(new Date(d.getFullYear(), 0, 1)), k) + 1;
}

export function daysInYear(y: number): number {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
}
