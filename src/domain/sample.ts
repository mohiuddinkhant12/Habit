// Sample data for exploring the app: six months of plausible history for the
// prototype's ten habits, generated relative to today. Ported from the
// design prototype's seeding so the charts tell the same story.

import { STARTERS } from './catalog';
import { addDays, weekStartOf, weekdayOf } from './dates';
import { habitFromStarter } from './factory';
import { goalView } from './goals';
import type { DateKey, Entry, Goal, Habit, Log, Routine, RoutineRun } from './types';

const TI = 179;

const PROFILE: Record<string, { rate: number; streak: number; missed?: boolean; today?: number }> = {
  vitamins: { rate: 0.93, streak: 46, today: 1 },
  stretch: { rate: 0.82, streak: 17, today: 1 },
  meditate: { rate: 0.78, streak: 12 },
  water: { rate: 0.84, streak: 21, today: 5 },
  walk: { rate: 0.7, streak: 5, today: 5200 },
  spanish: { rate: 0.68, streak: 3 },
  gym: { rate: 0.5, streak: 0 },
  read: { rate: 0.72, streak: 8, missed: true },
  journal: { rate: 0.76, streak: 29 },
  phone: { rate: 0.7, streak: 9 },
};

const NOTES: [string, number, string][] = [
  ['read', 3, 'Finished chapter 9 on the train'],
  ['meditate', 2, 'Hard to focus — counting breaths helped'],
  ['journal', 7, 'Wrote about the weekend trip'],
  ['walk', 4, 'Evening walk with Sam'],
  ['stretch', 9, 'Tight hamstrings after the run'],
];

const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

type Code = 'd' | 's' | 'p' | 'm' | 'o';

function history(h: Habit, rate: number, seed: number, today: DateKey): Code[] {
  const r = rng(seed * 7919 + 13);
  const kind = h.schedules[0].s.kind;
  const o: Code[] = [];
  for (let i = 0; i < TI; i++) {
    const wd = weekdayOf(addDays(today, i - TI));
    if (kind === 'weekdays' && wd > 4) { o.push('o'); continue; }
    if (kind === 'perWeek') { o.push(r() < 0.45 ? 'd' : 'o'); continue; }
    const p = rate + (wd > 4 ? -0.14 : 0.03) + (i / TI) * 0.12 - 0.06 + (wd === 1 ? 0.06 : 0);
    const x = r();
    o.push(x < p ? 'd' : x < p + 0.05 ? 's' : (h.type === 'qty' || h.type === 'dur') && x < p + 0.14 ? 'p' : 'm');
  }
  return o;
}

/** Shape the most recent days so each habit ends on the streak the story needs. */
function shapeTail(o: Code[], kind: string, streak: number, missed: boolean) {
  let k = TI - 1;
  if (missed) { o[k] = 'm'; k--; }
  if (kind === 'perWeek') return;
  let n = streak;
  while (n > 0 && k >= 0) { if (o[k] !== 'o') { o[k] = 'd'; n--; } k--; }
  // Three misses in a row end the earlier run even with grace days on.
  for (let m = 0; m < 3 && k >= 0; k--) if (o[k] !== 'o') { o[k] = 'm'; m++; }
}

function stamp(h: Habit, k: DateKey, r: () => number): number {
  const base = h.reminder ?? { Morning: '07:30', Afternoon: '14:00', Evening: '21:00', Anytime: '12:00' }[h.time];
  const [hh, mm] = base.split(':').map(Number);
  const [y, mo, d] = k.split('-').map(Number);
  return new Date(y, mo - 1, d, hh, mm + Math.round((r() - 0.3) * 50)).getTime();
}

export interface SampleData {
  habits: Habit[];
  log: Log;
  routines: Routine[];
  runs: RoutineRun[];
  goals: Goal[];
  xp: number;
}

export function sampleData(today: DateKey): SampleData {
  const created = addDays(today, -TI);
  const habits: Habit[] = STARTERS.filter((s) => PROFILE[s.id]).map((s) => habitFromStarter(s, created));
  const by = (id: string) => habits.find((h) => h.id === id)!;
  by('meditate').stackAfter = 'stretch';
  by('journal').stackAfter = 'read';

  const codes: Record<string, Code[]> = {};
  habits.forEach((h, i) => {
    codes[h.id] = history(h, PROFILE[h.id].rate, i + 1, today);
  });

  // Walking and reading move together, so Insights has a real pattern to find.
  const q = rng(5);
  const w = codes.walk;
  const rd = codes.read;
  for (let i = 0; i < TI - 9; i++) {
    if (w[i] === 'd' && rd[i] === 'm' && q() < 0.7) rd[i] = 'd';
    else if (w[i] !== 'd' && rd[i] === 'd' && q() < 0.35) rd[i] = 'm';
  }
  for (const h of habits) shapeTail(codes[h.id], h.schedules[0].s.kind, PROFILE[h.id].streak, !!PROFILE[h.id].missed);

  // Strength training: one session so far this week, earlier than today.
  const ws = weekStartOf(today);
  const gym = codes.gym;
  for (let i = 0; i < TI; i++) if (addDays(today, i - TI) >= ws) gym[i] = 'o';
  if (weekdayOf(today) > 0) gym[TI - weekdayOf(today)] = 'd';

  const log: Log = {};
  const tr = rng(11);
  for (const h of habits) {
    const days: Record<DateKey, Entry> = {};
    codes[h.id].forEach((c, i) => {
      const k = addDays(today, i - TI);
      if (c === 'd') days[k] = { v: h.type === 'qty' || h.type === 'dur' ? h.target : h.type === 'avoid' ? 0 : 1, t: h.target, at: stamp(h, k, tr) };
      else if (c === 'p') days[k] = { v: h.type === 'qty' ? Math.round(h.target / 2 / h.step) * h.step : Math.round(h.target / 2), t: h.target, at: stamp(h, k, tr) };
      else if (c === 's') days[k] = { v: 0, skip: true };
      else if (c === 'm' && h.type === 'avoid') days[k] = { v: 0, slip: true };
    });
    const tv = PROFILE[h.id].today;
    if (tv) days[today] = { v: tv, t: h.target, at: Date.now() };
    log[h.id] = days;
  }
  for (const [id, ago, text] of NOTES) {
    const k = addDays(today, -ago);
    log[id][k] = { ...(log[id][k] ?? { v: 0 }), note: text };
  }

  const cold = habitFromStarter({ id: 'cold', name: 'Cold shower', icon: 'drop', type: 'bool', time: 'Morning', cat: 'Health', sched: 'daily', est: 3 }, created);
  cold.archived = true;
  const coldCodes = history(cold, 0.4, 99, today);
  shapeTail(coldCodes, 'daily', 0, false);
  log.cold = {};
  coldCodes.forEach((c, i) => { if (c === 'd') log.cold[addDays(today, i - TI)] = { v: 1, t: 1 }; });
  habits.push(cold);

  const routines: Routine[] = [
    { id: 'am', name: 'Morning', time: '07:00', steps: ['stretch', 'meditate', 'vitamins', 'water'] },
    { id: 'pm', name: 'Wind-down', time: '21:30', steps: ['read', 'journal', 'phone'] },
  ];
  const runs: RoutineRun[] = [];
  for (let i = TI - 40; i < TI; i++) {
    if (routines[0].steps.every((id) => codes[id][i] === 'd')) runs.push({ routineId: 'am', date: addDays(today, i - TI), results: ['d', 'd', 'd', 'd'] });
  }

  const y = Number(today.slice(0, 4));
  const goals: Goal[] = [
    { id: 'books', name: 'Read 20 books', target: 20, unit: 'books', habitId: 'read', metric: 'sum', scale: 300, base: 0, year: y },
    { id: 'med', name: 'Meditate 100 hours', target: 100, unit: 'hours', habitId: 'meditate', metric: 'sum', scale: 60, base: 0, year: y },
    { id: 'steps', name: 'Walk 2 million steps', target: 2000000, unit: 'steps', habitId: 'walk', metric: 'sum', scale: 1, base: 0, year: y },
  ];
  const want: Record<string, number> = { books: 14, med: 61.5, steps: 1482000 };
  for (const g of goals) {
    const got = goalView(g, by(g.habitId), log, today).cur;
    g.base = Math.max(0, Math.round((want[g.id] - got) * 10) / 10);
  }

  return { habits, log, routines, runs, goals, xp: 1240 };
}
