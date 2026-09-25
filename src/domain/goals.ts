import { addDays, dateOf, dayOfYear, daysInYear, keyOf, MON, range, shortD } from './dates';
import { statusOn, streakOf, type StreakOpts } from './status';
import type { DateKey, Goal, Habit, Log, RoutineRun, Routine } from './types';

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 1.5k / 1.48M style for large numbers. */
export function short(n: number): string {
  if (Math.abs(n) >= 1e6) return Math.round(n / 1e4) / 100 + 'M';
  if (Math.abs(n) >= 1000) return Math.round(n / 100) / 10 + 'k';
  return String(Math.round(n * 10) / 10);
}

export const fmtGoal = (v: number, unit: string) => (unit === 'steps' ? short(v) : String(Math.round(v * 10) / 10));

function goalMetricOn(g: Goal, h: Habit | undefined, log: Log, k: DateKey, today: DateKey): number {
  if (!h) return 0;
  const e = log[h.id]?.[k];
  if (!e) return 0;
  if (g.metric === 'count') return statusOn(h, log, k, today) === 'd' ? 1 : 0;
  return e.skip ? 0 : e.v;
}

export interface GoalView {
  cur: number;
  frac: number;
  pace: number; // where an even pace would be today, 0..1
  ahead: boolean;
  eta: string;
  etaKey: DateKey | null;
  left: number;
  months: { label: string; v: number; current: boolean }[];
  perMonth: string;
  note: string;
  milestones: { v: number; x: number; got: boolean }[];
}

export function goalView(g: Goal, h: Habit | undefined, log: Log, today: DateKey): GoalView {
  const y = dateOf(today).getFullYear();
  const jan1 = keyOf(new Date(y, 0, 1));
  const doy = dayOfYear(today);
  const diy = daysInYear(y);
  const monthNow = dateOf(today).getMonth();

  const monthly = Array.from({ length: monthNow + 1 }, () => 0);
  for (const k of range(jan1, today)) {
    const v = goalMetricOn(g, h, log, k, today);
    if (v) monthly[dateOf(k).getMonth()] += v / g.scale;
  }
  // Progress carried in from before this device's history (a backup, another app) has no dates, so it's spread evenly.
  for (let m = 0; m <= monthNow; m++) monthly[m] += g.base / (monthNow + 1);

  const cur = monthly.reduce((a, b) => a + b, 0);
  const frac = Math.min(1, cur / g.target);
  const pace = doy / diy;
  const perDay = cur / doy;
  const etaKey = perDay > 0 && cur < g.target ? addDays(today, Math.ceil((g.target - cur) / perDay)) : cur >= g.target ? today : null;
  const etaDate = etaKey ? dateOf(etaKey) : null;
  const eta = !etaDate ? '—' : cur >= g.target ? 'Reached' : etaDate.getFullYear() === y ? shortD(etaKey!) : shortD(etaKey!) + ', ' + etaDate.getFullYear();
  const dec31 = keyOf(new Date(y, 11, 31));
  const monthsElapsed = doy / (diy / 12);

  let note = 'On pace.';
  if (cur >= g.target) note = 'Reached — everything from here is extra.';
  else if (etaKey && etaKey < dec31) {
    const weeks = Math.round((dateOf(dec31).getTime() - dateOf(etaKey).getTime()) / 6048e5);
    note = weeks >= 1 ? `About ${weeks} week${weeks === 1 ? '' : 's'} ahead of Dec 31.` : 'On pace.';
  } else {
    const daysLeft = Math.max(1, diy - doy);
    const need = (g.target - cur) / daysLeft;
    if (g.unit === 'hours') note = `Slightly behind — ${Math.round(need * 60)} minutes a day would close the gap.`;
    else if (need < 1) note = `Slightly behind — ${Math.round(need * 30.4 * 10) / 10} ${g.unit} a month would close the gap.`;
    else note = `Slightly behind — ${short(need)} ${g.unit} a day would close the gap.`;
  }

  const unitRate = cur / Math.max(0.5, monthsElapsed);
  return {
    cur,
    frac,
    pace,
    ahead: frac >= pace,
    eta,
    etaKey,
    left: Math.max(0, g.target - cur),
    months: monthly.map((v, m) => ({ label: MON[m][0], v, current: m === monthNow })),
    perMonth: `${short(unitRate)} ${g.unit} a month`,
    note,
    milestones: [0.25, 0.5, 0.75, 1].map((f) => ({ v: g.target * f, x: f, got: cur >= g.target * f })),
  };
}

export interface Achievement {
  n: string;
  d: string;
  icon: string;
  got: boolean;
  p: number;
  t: number;
}

export function achievements(hs: Habit[], log: Log, runs: RoutineRun[], routines: Routine[], today: DateKey, opts: StreakOpts): Achievement[] {
  let bestStreak = 0;
  let century = 0;
  let comeback = false;
  let pages = 0;
  const monthStart = keyOf(new Date(dateOf(today).getFullYear(), dateOf(today).getMonth(), 1));
  for (const h of hs) {
    const s = streakOf(h, log, today, opts);
    if (s.unit === 'days') bestStreak = Math.max(bestStreak, s.best);
    let done = 0;
    const keys = Object.keys(log[h.id] ?? {}).sort();
    for (const k of keys) {
      const st = statusOn(h, log, k, today);
      if (st === 'd') done++;
      if (!comeback && st === 'd' && statusOn(h, log, addDays(k, -1), today) === 'm') comeback = true;
    }
    century = Math.max(century, done);
    if (h.type === 'qty' && /page/i.test(h.unit)) {
      let p = 0;
      for (const k of range(monthStart, today)) p += log[h.id]?.[k]?.v ?? 0;
      pages = Math.max(pages, p);
    }
  }
  const morning = new Set(routines.filter((r) => r.time < '12:00').map((r) => r.id));
  const early = runs.filter((r) => morning.has(r.routineId) && r.results.every((x) => x === 'd')).length;
  const a = (n: string, d: string, icon: string, p: number, t: number): Achievement => ({ n, d, icon, got: p >= t, p: Math.min(p, t), t });
  return [
    a('First week', 'A 7-day streak on any habit', 'calendar-check', bestStreak, 7),
    a('Early riser', 'Morning routine 10 times', 'sun-horizon', early, 10),
    a('Comeback', 'Back on track the day after a miss', 'arrow-counter-clockwise', comeback ? 1 : 0, 1),
    a('Century', '100 check-ins on one habit', 'medal', century, 100),
    a('Thirty', 'A 30-day streak', 'fire', bestStreak, 30),
    a('Deep reader', '500 pages in a month', 'book-open', pages, 500),
  ];
}
