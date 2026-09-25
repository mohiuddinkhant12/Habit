import { addDays, DL, dateOf, DOW_LONG, range, shortD, weekdayOf, MON, keyOf } from './dates';
import { dayStat, momentumOf, rate, statusOn, streakOf, type StreakOpts } from './status';
import type { DateKey, Habit, Log, Status } from './types';

export type Period = 'Week' | 'Month' | 'Quarter';
export const PERIOD_LEN: Record<Period, number> = { Week: 7, Month: 30, Quarter: 84 };

export interface Bar {
  v: number;
  label: string;
  current: boolean;
  aria: string;
}

/** Weekday labels and indices in display order for the chosen week start. */
export function weekOrder(weekStart: 'Monday' | 'Sunday'): number[] {
  return weekStart === 'Monday' ? [0, 1, 2, 3, 4, 5, 6] : [6, 0, 1, 2, 3, 4, 5];
}

export function checkinCount(hs: Habit[], log: Log, today: DateKey): number {
  let n = 0;
  for (const h of hs) for (const k of Object.keys(log[h.id] ?? {})) {
    const s = statusOn(h, log, k, today);
    if (s === 'd' || s === 'p') n++;
  }
  return n;
}

export interface Correlation {
  a: Habit;
  b: Habit;
  withA: number;
  withoutA: number;
}

/**
 * Looks for the pair of habits whose completions move together most over
 * the last 90 days. Only reported as a correlation, never as a cause.
 */
export function findCorrelation(hs: Habit[], log: Log, today: DateKey): Correlation | null {
  let best: Correlation | null = null;
  const days = range(addDays(today, -90), addDays(today, -1));
  for (const a of hs) for (const b of hs) {
    if (a === b || a.type === 'avoid' || b.type === 'avoid') continue;
    let a1 = 0, b1 = 0, a0 = 0, b0 = 0;
    for (const k of days) {
      const y = statusOn(b, log, k, today);
      if (y === 'o' || y === 'f') continue;
      const x = statusOn(a, log, k, today);
      if (x === 'o') continue;
      if (x === 'd') { a1++; if (y === 'd') b1++; } else { a0++; if (y === 'd') b0++; }
    }
    if (a1 < 10 || a0 < 10) continue;
    const withA = b1 / a1;
    const withoutA = b0 / a0;
    if (withA - withoutA >= 0.15 && (!best || withA - withoutA > best.withA - best.withoutA)) best = { a, b, withA, withoutA };
  }
  return best;
}

export interface Insights {
  rate: number;
  delta: number;
  compareTo: string;
  rangeLabel: string;
  bars: Bar[];
  counts: { d: number; p: number; s: number; m: number };
  fullDays: boolean[]; // per day in window: all done
  fullDaysAny: boolean[];
  weeks: number[]; // 12-week trend
  calendar: { day: number; key: DateKey | null; level: number; future: boolean; today: boolean }[];
  monthName: string;
  timeOfDay: { label: string; v: number; best: boolean }[];
  weekday: { label: string; v: number; best: boolean }[];
  bestWeekday: string;
  byHabit: { h: Habit; v: number; strip: Status[] }[];
  streaks: { h: Habit; current: number; best: number; momentum: number }[];
  correlation: Correlation | null;
  checkins: number;
  logged: number;
}

export function computeInsights(act: Habit[], log: Log, today: DateKey, period: Period, opts: StreakOpts): Insights {
  const len = PERIOD_LEN[period];
  const from = addDays(today, -len + 1);
  const cur = rate(act, log, from, today, today);
  const prev = rate(act, log, addDays(today, -2 * len + 1), addDays(today, -len), today);
  const compareTo = { Week: 'last week', Month: 'the previous 30 days', Quarter: 'the previous 12 weeks' }[period];

  const bars: Bar[] = [];
  if (period === 'Quarter') {
    for (let w = 11; w >= 0; w--) {
      const e = addDays(today, -w * 7);
      const v = rate(act, log, addDays(e, -6), e, today);
      bars.push({ v, label: w === 11 ? '12w' : w === 0 ? 'Now' : '', current: w === 0, aria: 'Week of ' + shortD(addDays(e, -6)) + ': ' + Math.round(v * 100) + '%' });
    }
  } else {
    for (const k of range(from, today)) {
      const s = dayStat(act, log, k, today);
      const v = s.due ? s.done / s.due : 0;
      const wd = weekdayOf(k);
      bars.push({ v, label: period === 'Week' ? DL[wd] : wd === 0 ? String(dateOf(k).getDate()) : '', current: k === today, aria: shortD(k) + ': ' + Math.round(v * 100) + '%' });
    }
  }

  const counts = { d: 0, p: 0, s: 0, m: 0 };
  const fullDays: boolean[] = [];
  const fullDaysAny: boolean[] = [];
  for (const k of range(from, today)) {
    let full = true;
    let any = false;
    for (const h of act) {
      const s = statusOn(h, log, k, today);
      if (s === 'o' || s === 'n' || s === 'f') continue;
      any = true;
      counts[s]++;
      if (s !== 'd' && s !== 's') full = false;
    }
    fullDays.push(any && full);
    fullDaysAny.push(any);
  }

  const weeks: number[] = [];
  for (let w = 11; w >= 0; w--) {
    const e = addDays(today, -w * 7);
    weeks.push(rate(act, log, addDays(e, -6), e, today));
  }

  // Current month calendar, padded to the chosen week start.
  const td = dateOf(today);
  const first = keyOf(new Date(td.getFullYear(), td.getMonth(), 1));
  const dim = new Date(td.getFullYear(), td.getMonth() + 1, 0).getDate();
  const lead = (weekdayOf(first) - (opts.weekStart === 'Monday' ? 0 : 6) + 7) % 7;
  const calendar: Insights['calendar'] = [];
  for (let i = 0; i < lead; i++) calendar.push({ day: 0, key: null, level: -1, future: false, today: false });
  for (let d = 1; d <= dim; d++) {
    const k = addDays(first, d - 1);
    const future = k > today;
    const st = future ? null : dayStat(act, log, k, today);
    const f = st && st.due ? st.done / st.due : 0;
    const level = future ? -1 : f >= 0.999 ? 4 : f >= 0.75 ? 3 : f >= 0.5 ? 2 : f > 0 ? 1 : 0;
    calendar.push({ day: d, key: k, level, future, today: k === today });
  }
  while (calendar.length % 7) calendar.push({ day: 0, key: null, level: -1, future: false, today: false });

  const tods = (['Morning', 'Afternoon', 'Evening', 'Anytime'] as const)
    .map((t) => {
      const g = act.filter((h) => h.time === t);
      return { label: t, v: g.length ? rate(g, log, from, today, today) : 0, n: g.length, best: false };
    })
    .filter((x) => x.n);
  const bt = tods.reduce((a, b) => (b.v > a.v ? b : a), tods[0]);
  if (bt) bt.best = true;

  const wdr = [0, 1, 2, 3, 4, 5, 6].map((wd) => {
    let due = 0;
    let done = 0;
    for (const k of range(addDays(today, -83), today)) {
      if (weekdayOf(k) !== wd) continue;
      const s = dayStat(act, log, k, today);
      due += s.due;
      done += s.done;
    }
    return due ? done / due : 0;
  });
  const bw = wdr.indexOf(Math.max(...wdr));
  const weekday = weekOrder(opts.weekStart).map((wd) => ({ label: DL[wd], v: wdr[wd], best: wd === bw }));

  const byHabit = act
    .map((h) => ({ h, v: rate([h], log, from, today, today), strip: range(addDays(today, -13), today).map((k) => statusOn(h, log, k, today)) }))
    .sort((a, b) => b.v - a.v);

  const streaks = act
    .filter((h) => h.schedules[h.schedules.length - 1].s.kind !== 'perWeek')
    .map((h) => {
      const s = streakOf(h, log, today, opts);
      return { h, current: s.current, best: s.best, momentum: momentumOf(h, log, today) };
    });

  const logged = checkinCount(act, log, today);
  return {
    rate: cur,
    delta: Math.round((cur - prev) * 100),
    compareTo,
    rangeLabel: period === 'Week' ? shortD(from) + ' – ' + dateOf(today).getDate() : shortD(from) + ' – ' + shortD(today),
    bars,
    counts,
    fullDays,
    fullDaysAny,
    weeks,
    calendar,
    monthName: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][td.getMonth()],
    timeOfDay: tods.map(({ label, v, best }) => ({ label, v, best })),
    weekday,
    bestWeekday: DOW_LONG[bw],
    byHabit,
    streaks,
    correlation: findCorrelation(act.filter((h) => !isNew(h, log, today)), log, today),
    checkins: counts.d + counts.p,
    logged,
  };
}

/** Fewer than a week of history — detail screens show the "starts today" state. */
export function isNew(h: Habit, log: Log, today: DateKey): boolean {
  const keys = Object.keys(log[h.id] ?? {});
  const first = keys.reduce((a, b) => (b < a ? b : a), h.createdAt);
  return first > addDays(today, -7);
}

export interface HabitDetail {
  cells: { k: DateKey; s: Status }[]; // 26 weeks, column-major by week
  monthLabels: string[];
  weekday: { label: string; v: number; best: boolean }[];
  weeks: number[];
  notes: string[];
  history: { k: DateKey; s: Status; note?: string }[];
  rate30: number;
  momentum: number;
  total: number;
}

export function habitDetail(h: Habit, log: Log, today: DateKey, opts: StreakOpts): HabitDetail {
  const ws = opts.weekStart;
  const lastCol = addDays(today, -((weekdayOf(today) - (ws === 'Monday' ? 0 : 6) + 7) % 7));
  const start = addDays(lastCol, -25 * 7);
  const cells: HabitDetail['cells'] = [];
  const monthLabels: string[] = [];
  for (let c = 0; c < 26; c++) {
    const col = addDays(start, c * 7);
    monthLabels.push(dateOf(col).getDate() <= 7 ? MON[dateOf(col).getMonth()] : '');
    for (let r = 0; r < 7; r++) {
      const k = addDays(col, r);
      cells.push({ k, s: statusOn(h, log, k, today) });
    }
  }

  const hw = [0, 1, 2, 3, 4, 5, 6].map((wd) => {
    let due = 0;
    let done = 0;
    for (const k of range(addDays(today, -89), today)) {
      if (weekdayOf(k) !== wd) continue;
      const s = statusOn(h, log, k, today);
      if (s === 'o' || s === 's' || s === 'n' || s === 'f') continue;
      due++;
      done += s === 'd' ? 1 : s === 'p' ? 0.5 : 0;
    }
    return due ? done / due : -1;
  });
  const valid = hw.map((v, i) => ({ v, i })).filter((x) => x.v >= 0);
  const hb = valid.length ? valid.reduce((a, b) => (b.v > a.v ? b : a)).i : 0;
  const hl = valid.length ? valid.reduce((a, b) => (b.v < a.v ? b : a)).i : 0;

  const weeks: number[] = [];
  for (let w = 11; w >= 0; w--) {
    const e = addDays(today, -w * 7);
    weeks.push(rate([h], log, addDays(e, -6), e, today));
  }

  let partials = 0;
  for (const k of range(addDays(today, -89), today)) if (statusOn(h, log, k, today) === 'p') partials++;
  let total = 0;
  for (const k of Object.keys(log[h.id] ?? {})) if (statusOn(h, log, k, today) === 'd') total++;

  const notes: string[] = [];
  if (!isNew(h, log, today) && valid.length) {
    const st = streakOf(h, log, today, opts);
    notes.push(`You’re most consistent on ${DOW_LONG[hb]}s — ${Math.round(hw[hb] * 100)}% of the time.`);
    if (hl !== hb) notes.push(`${DOW_LONG[hl]}s are lighter at ${Math.round(hw[hl] * 100)}%. A smaller target that day could keep things moving.`);
    const lag = reminderLag(h, log, today);
    if (h.reminder && lag !== null && lag <= 60) notes.push(`You usually check in within an hour of your ${h.reminder} reminder.`);
    if (partials > 2) notes.push(`${partials} partial days in the last 90. Showing up counts.`);
    notes.push(`Longest streak so far: ${st.best} ${st.unit}.`);
  }

  const history: HabitDetail['history'] = [];
  for (let k = today; k >= h.createdAt && history.length < 14 && k > addDays(today, -400); k = addDays(k, -1)) {
    const s = statusOn(h, log, k, today);
    if (s === 'o' || s === 'n') continue;
    history.push({ k, s, note: log[h.id]?.[k]?.note });
  }

  return {
    cells,
    monthLabels,
    weekday: weekOrder(ws).map((wd) => ({ label: DL[wd], v: Math.max(0, hw[wd]), best: wd === hb })),
    weeks,
    notes,
    history,
    rate30: Math.round(rate([h], log, addDays(today, -29), today, today) * 100),
    momentum: momentumOf(h, log, today),
    total,
  };
}

/** Median minutes between the reminder time and actual check-ins over the last 30 days. */
export function reminderLag(h: Habit, log: Log, today: DateKey): number | null {
  if (!h.reminder) return null;
  const [rh, rm] = h.reminder.split(':').map(Number);
  const lags: number[] = [];
  for (const k of range(addDays(today, -29), today)) {
    const at = log[h.id]?.[k]?.at;
    if (!at) continue;
    const d = new Date(at);
    lags.push(Math.abs(d.getHours() * 60 + d.getMinutes() - (rh * 60 + rm)));
  }
  if (lags.length < 5) return null;
  lags.sort((a, b) => a - b);
  return lags[Math.floor(lags.length / 2)];
}

/** Median check-in time over the last 14 check-ins — drives smart reminders. */
export function typicalCheckin(h: Habit, log: Log, today: DateKey): string | null {
  const mins: number[] = [];
  for (const k of range(addDays(today, -30), today)) {
    const at = log[h.id]?.[k]?.at;
    if (at) {
      const d = new Date(at);
      mins.push(d.getHours() * 60 + d.getMinutes());
    }
  }
  if (mins.length < 5) return null;
  mins.sort((a, b) => a - b);
  const m = mins[Math.floor(mins.length / 2)];
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
