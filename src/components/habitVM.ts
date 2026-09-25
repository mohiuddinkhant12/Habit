import { TYPE_LABEL } from '@/domain/catalog';
import { fmtNum, short } from '@/domain/goals';
import { currentSchedule, momentumOf, scheduleLabel, statusOn, streakOf, weekDoneOf, type StreakOpts } from '@/domain/status';
import type { DateKey, Habit, Log, Settings, Status } from '@/domain/types';

/** Everything a Today row, tile or sheet needs to draw one habit. */
export interface HabitVM {
  h: Habit;
  st: Status;
  done: boolean;
  skipped: boolean;
  slipped: boolean;
  value: number;
  frac: number;
  meta: string;
  valText: string;
  qtyText: string;
  aria: string;
  streak: number;
  momentum: number;
}

export function habitVM(h: Habit, log: Log, today: DateKey, s: Pick<Settings, 'recovery' | 'weekStart'>, opts: StreakOpts): HabitVM {
  const e = log[h.id]?.[today];
  const st = statusOn(h, log, today, today);
  const done = st === 'd';
  const skipped = !!e?.skip;
  const slipped = !!e?.slip;
  const value = e?.v ?? 0;
  const mom = s.recovery === 'Momentum';
  const sc = currentSchedule(h);
  const streak = streakOf(h, log, today, opts);
  const m = momentumOf(h, log, today);

  const meta: string[] = [];
  if (skipped) meta.push('Skipped today — streak safe');
  else if (h.type === 'avoid') meta.push(slipped ? 'Tomorrow is a fresh start' : mom ? m + '% clean · 30 days' : 'Clean for ' + streak.current + ' days');
  else if (sc.kind === 'perWeek') meta.push(weekDoneOf(h, log, today, s.weekStart) + ' of ' + sc.n + ' this week');
  else meta.push(mom ? m + '% momentum' : streak.current ? streak.current + '-day streak' : 'New — day one');
  if (h.type === 'dur') meta.push(value > 0 && !done ? Math.floor(value) + ' of ' + h.target + ' min' : h.target + ' min');
  if (h.type === 'qty') meta.push(fmtNum(h.target) + ' ' + h.unit);
  if (h.reminder && !done && !skipped && h.type !== 'avoid') meta.push(h.reminder);

  const frac = h.type === 'qty' || h.type === 'dur' ? Math.min(1, value / h.target) : done ? 1 : 0;
  const valText =
    h.type === 'bool' ? (done ? 'Done' : skipped ? 'Skipped' : '—') : h.type === 'qty' ? short(value) + '/' + short(h.target) : h.type === 'dur' ? Math.floor(value) + '/' + h.target + 'm' : slipped ? 'Slipped' : 'Clean';

  return {
    h, st, done, skipped, slipped, value, frac,
    meta: meta.join(' · '),
    valText,
    qtyText: short(value) + '/' + short(h.target),
    aria: `${h.name}, ${done ? 'done' : skipped ? 'skipped' : 'not done'}, ${meta.join(', ')}`,
    streak: streak.current,
    momentum: m,
  };
}

/** "Every day · Morning · Amount · 8 glasses" */
export function habitSub(h: Habit): string {
  return scheduleLabel(currentSchedule(h)) + ' · ' + h.time + ' · ' + TYPE_LABEL[h.type] + (h.type === 'qty' ? ' · ' + fmtNum(h.target) + ' ' + h.unit : h.type === 'dur' ? ' · ' + h.target + ' min' : '');
}

/** The value shown next to a status in history lists. */
export function valFor(h: Habit, s: Status, v?: number): string {
  const u = h.unit || '';
  if (s === 'd') return h.type === 'qty' ? fmtNum(v && v > h.target ? v : h.target) + ' ' + u : h.type === 'dur' ? (v && v > h.target ? v : h.target) + ' min' : h.type === 'avoid' ? 'Clean' : 'Done';
  if (s === 'p') return h.type === 'qty' ? fmtNum(v ?? h.target / 2) + ' of ' + fmtNum(h.target) + ' ' + u : h.type === 'dur' ? Math.round(v ?? h.target / 2) + ' of ' + h.target + ' min' : 'Partial';
  if (s === 'm') return h.type === 'avoid' ? 'Slipped' : 'Missed';
  return { s: 'Skipped', n: 'Not yet', o: 'Off day', f: '', d: '', p: '', m: '' }[s];
}

export const STATUS_LABEL: Record<Status, string> = { d: 'Done', p: 'Partial', s: 'Skipped', m: 'Missed', n: 'Not yet', o: 'Off day', f: '' };
