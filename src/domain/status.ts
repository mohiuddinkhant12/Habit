import { addDays, range, weekStartOf, weekdayOf } from './dates';
import type { DateKey, Entry, Habit, Log, Schedule, Status } from './types';

export function scheduleOn(h: Habit, k: DateKey): Schedule {
  let s = h.schedules[0].s;
  for (const v of h.schedules) if (v.from <= k) s = v.s;
  return s;
}

export function currentSchedule(h: Habit): Schedule {
  return h.schedules[h.schedules.length - 1].s;
}

export function isScheduled(s: Schedule, k: DateKey): boolean {
  const wd = weekdayOf(k);
  switch (s.kind) {
    case 'daily':
    case 'perWeek':
      return true;
    case 'weekdays':
      return wd < 5;
    case 'days':
      return !!s.days[wd];
  }
}

export function isPausedOn(h: Habit, k: DateKey): boolean {
  return h.pauses.some((p) => p.from <= k && (p.to === null || k < p.to));
}

export function entryOf(log: Log, id: string, k: DateKey): Entry | undefined {
  return log[id]?.[k];
}

export function valueOf(log: Log, id: string, k: DateKey): number {
  return log[id]?.[k]?.v ?? 0;
}

/** Status of a habit on a given day — the single source every chart, streak and list reads from. */
export function statusOn(h: Habit, log: Log, k: DateKey, today: DateKey): Status {
  if (k > today) return 'f';
  if (k < h.createdAt) return 'o';
  if (isPausedOn(h, k)) return 'o';
  const s = scheduleOn(h, k);
  if (!isScheduled(s, k)) return 'o';
  const e = entryOf(log, h.id, k);
  if (e?.skip) return 's';
  const v = e?.v ?? 0;
  const target = e?.t ?? h.target;
  if (h.type === 'avoid') return e?.slip ? 'm' : 'd';
  const full = h.type === 'bool' ? v >= 1 : v >= target;
  if (s.kind === 'perWeek') return full ? 'd' : v > 0 && h.type !== 'bool' ? 'p' : k === today ? 'n' : 'o';
  if (full) return 'd';
  if (v > 0 && h.type !== 'bool') return 'p';
  return k === today ? 'n' : 'm';
}

export function isDoneOn(h: Habit, log: Log, k: DateKey, today: DateKey): boolean {
  return statusOn(h, log, k, today) === 'd';
}

/** Planned vs done for a day. Partial counts half; skipped and off days are not due. */
export function dayStat(hs: Habit[], log: Log, k: DateKey, today: DateKey) {
  let due = 0;
  let done = 0;
  for (const h of hs) {
    const s = statusOn(h, log, k, today);
    if (s === 'o' || s === 's' || s === 'f' || s === 'n') continue;
    due++;
    done += s === 'd' ? 1 : s === 'p' ? 0.5 : 0;
  }
  return { due, done };
}

export function rate(hs: Habit[], log: Log, a: DateKey, b: DateKey, today: DateKey): number {
  let due = 0;
  let done = 0;
  for (const k of range(a, b)) {
    const d = dayStat(hs, log, k, today);
    due += d.due;
    done += d.done;
  }
  return due ? done / due : 0;
}

/** 30-day completion rate, the "momentum" recovery model. */
export function momentumOf(h: Habit, log: Log, today: DateKey): number {
  return Math.round(rate([h], log, addDays(today, -29), today, today) * 100);
}

export interface StreakInfo {
  current: number;
  best: number;
  unit: 'days' | 'weeks';
  /** Missed days inside the current run that a grace day covered. */
  covered: DateKey[];
  /** Grace days still unused in the current week. */
  graceLeft: number;
}

export interface StreakOpts {
  graceN: number;
  weekStart: 'Monday' | 'Sunday';
}

function firstDay(h: Habit, log: Log, today: DateKey): DateKey {
  let start = h.createdAt;
  for (const k of Object.keys(log[h.id] ?? {})) if (k < start) start = k;
  const floor = addDays(today, -730);
  return start < floor ? floor : start;
}

/**
 * Streaks that survive real life: skipped, off and partial days hold the
 * streak, and up to `graceN` missed days a week are covered when the habit
 * has grace days switched on. Frequency habits count consecutive weeks met.
 */
export function streakOf(h: Habit, log: Log, today: DateKey, opts: StreakOpts): StreakInfo {
  const start = firstDay(h, log, today);
  const s = currentSchedule(h);
  const thisWeek = weekStartOf(today, opts.weekStart);

  if (s.kind === 'perWeek') {
    let run = 0;
    let best = 0;
    for (let w = weekStartOf(start, opts.weekStart); w <= thisWeek; w = addDays(w, 7)) {
      let n = 0;
      for (let i = 0; i < 7; i++) if (statusOn(h, log, addDays(w, i), today) === 'd') n++;
      const target = (scheduleOn(h, w) as { n?: number }).n ?? s.n;
      if (n >= target) run++;
      else if (w < thisWeek) run = 0;
      best = Math.max(best, run);
    }
    return { current: run, best, unit: 'weeks', covered: [], graceLeft: 0 };
  }

  const used = new Map<DateKey, number>();
  let run = 0;
  let best = 0;
  let covered: DateKey[] = [];
  for (let k = start; k <= today; k = addDays(k, 1)) {
    const st = statusOn(h, log, k, today);
    if (st === 'd') run++;
    else if (st === 'm') {
      const wk = weekStartOf(k, opts.weekStart);
      const u = used.get(wk) ?? 0;
      if (h.grace && u < opts.graceN && run > 0) {
        used.set(wk, u + 1);
        covered.push(k);
      } else {
        run = 0;
        covered = [];
      }
    }
    best = Math.max(best, run);
  }
  const graceLeft = h.grace ? Math.max(0, opts.graceN - (used.get(thisWeek) ?? 0)) : 0;
  return { current: run, best, unit: 'days', covered, graceLeft };
}

/** Check-ins done so far in the current week — for "2 of 3 this week". */
export function weekDoneOf(h: Habit, log: Log, today: DateKey, weekStart: 'Monday' | 'Sunday'): number {
  let n = 0;
  for (const k of range(weekStartOf(today, weekStart), today)) if (statusOn(h, log, k, today) === 'd') n++;
  return n;
}

export function scheduleLabel(s: Schedule): string {
  switch (s.kind) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Weekdays';
    case 'perWeek':
      return s.n + '× per week';
    case 'days': {
      const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const picked = names.filter((_, i) => s.days[i]);
      return picked.length === 7 ? 'Every day' : picked.join(', ') || 'No days';
    }
  }
}
