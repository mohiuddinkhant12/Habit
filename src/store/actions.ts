// User-level actions. Screens, notification buttons and home-screen widgets
// all go through these, so every path gets the same undo, XP and milestone
// behaviour.

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { MILESTONES, STARTERS, stepFor, XP_MILESTONE_BONUS, XP_PER_CHECKIN } from '@/domain/catalog';
import { addDays, todayKey } from '@/domain/dates';
import { habitFromStarter, uid } from '@/domain/factory';
import { sampleData } from '@/domain/sample';
import { currentSchedule, isDoneOn, statusOn, streakOf, type StreakOpts } from '@/domain/status';
import type { Category, DateKey, Entry, Habit, HabitType, Log, Routine, Schedule, Settings, TimeOfDay } from '@/domain/types';
import { EMPTY, getData, useData, type Data } from './data';
import { useUI } from './ui';

export const streakOpts = (d: Pick<Data, 'settings'>): StreakOpts => ({ graceN: d.settings.graceN, weekStart: d.settings.weekStart });
const find = (id: string) => getData().habits.find((h) => h.id === id);

interface ChangeOpts {
  date?: DateKey;
  quiet?: boolean;
}

/** Update one habit's entry for a day, with XP, milestone and an undoable toast. */
function change(
  id: string,
  op: string,
  mutate: (e: Entry | undefined, h: Habit) => Entry | undefined,
  msg: ((h: Habit, afterDone: boolean) => string | null) | null,
  o: ChangeOpts = {},
) {
  const d = getData();
  const h = d.habits.find((x) => x.id === id);
  if (!h) return;
  const today = todayKey();
  const date = o.date ?? today;
  const before = isDoneOn(h, d.log, date, today);
  const bs = streakOf(h, d.log, today, streakOpts(d));

  const cur = d.log[id]?.[date];
  const next = mutate(cur ? { ...cur } : undefined, h);
  const days = { ...(d.log[id] ?? {}) };
  if (next && (next.v || next.skip || next.slip || next.note)) days[date] = { ...next, t: h.target, at: next.v > (cur?.v ?? 0) ? Date.now() : cur?.at };
  else delete days[date];
  const log: Log = { ...d.log, [id]: days };

  const after = isDoneOn(h, log, date, today);
  if (after && !before && !o.quiet && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  const xpDelta = d.settings.xpOn ? (after && !before ? XP_PER_CHECKIN : before && !after ? -XP_PER_CHECKIN : 0) : 0;
  const snap = { habits: d.habits, log: d.log, xp: d.xp };
  useData.getState().commit(op, { id, date, entry: next ?? null }, () => ({ log, xp: Math.max(0, d.xp + xpDelta) }));

  const as = streakOf(h, log, today, streakOpts(d));
  if (!o.quiet && d.settings.achievementsOn && as.unit === 'days' && as.current > bs.current && MILESTONES.includes(as.current)) {
    // The first 30-day run on any habit unlocks "Thirty" and a one-off XP bonus.
    const firstThirty = as.current === 30 && d.habits.every((x) => x.id === h.id ? bs.best < 30 : streakOf(x, d.log, today, streakOpts(d)).best < 30);
    if (firstThirty && d.settings.xpOn) useData.getState().commit('xp-bonus', { id, n: 30 }, (s) => ({ xp: s.xp + XP_MILESTONE_BONUS }));
    useUI.getState().showMilestone({ n: as.current, name: h.name, longest: as.current >= as.best, xp: d.settings.xpOn, unlocked: firstThirty ? 'Thirty' : null });
  }
  const text = msg?.(h, after);
  if (text && !o.quiet) useUI.getState().toast(text + (xpDelta > 0 ? '  +' + XP_PER_CHECKIN + ' XP' : ''), snap);
}

export function undo(snap: Pick<Data, 'habits' | 'log' | 'xp'>) {
  useData.getState().commit('undo', null, () => snap);
  useUI.getState().clearSnack();
}

export function toggle(id: string, o: ChangeOpts = {}) {
  const d = getData();
  const h = find(id);
  if (!h) return;
  const date = o.date ?? todayKey();
  const e = d.log[id]?.[date];
  if (e?.skip) return change(id, 'unskip', (x) => (x ? { ...x, skip: false } : x), () => 'Skip removed', o);
  const done = isDoneOn(h, d.log, date, todayKey());
  change(
    id,
    done ? 'unmark' : 'complete',
    (x) => ({ ...(x ?? {}), v: done ? 0 : h.type === 'bool' ? 1 : h.target, skip: false }),
    () => (done ? h.name + ' unmarked' : h.name + ' — done'),
    o,
  );
}

export function increment(id: string, dir: 1 | -1, o: ChangeOpts = {}) {
  const h = find(id);
  if (!h) return;
  const date = o.date ?? todayKey();
  const v0 = getData().log[id]?.[date]?.v ?? 0;
  const v = Math.max(0, v0 + dir * h.step);
  change(id, 'increment', (x) => ({ ...(x ?? {}), v, skip: false }), (hh, after) => (after && v0 < hh.target ? hh.name + ' — target reached' : null), o);
}

export function setValue(id: string, v: number, o: ChangeOpts = {}, message?: string) {
  change(id, 'set-value', (x) => ({ ...(x ?? {}), v, skip: false }), message ? () => message : null, o);
}

export function slip(id: string) {
  const d = getData();
  const h = find(id);
  if (!h) return;
  const e = d.log[id]?.[todayKey()];
  const best = streakOf(h, d.log, todayKey(), streakOpts(d)).best;
  if (e?.slip) change(id, 'unslip', (x) => ({ ...(x ?? { v: 0 }), slip: false }), () => 'Slip removed');
  else change(id, 'slip', (x) => ({ ...(x ?? { v: 0 }), slip: true }), () => `Logged. Your best of ${best} days still stands.`);
}

export function skip(id: string, o: ChangeOpts = {}) {
  change(id, 'skip', (x) => ({ ...(x ?? { v: 0 }), v: 0, skip: true }), (h) => h.name + ' skipped today — streak safe', o);
  useUI.getState().openSheet(null);
}

export function setNote(id: string, date: DateKey, text: string) {
  const d = getData();
  const cur = d.log[id]?.[date];
  const days = { ...(d.log[id] ?? {}) };
  if (text) days[date] = { ...(cur ?? { v: 0 }), note: text };
  else if (cur) days[date] = { ...cur, note: undefined };
  useData.getState().commit('note', { id, date, text }, () => ({ log: { ...d.log, [id]: days } }));
}

export function logYesterday(id: string) {
  const h = find(id);
  if (!h) return;
  const y = addDays(todayKey(), -1);
  change(id, 'log-past', (x) => ({ ...(x ?? {}), v: h.type === 'bool' ? 1 : h.target, skip: false, slip: false }), () => 'Logged ' + h.name + ' for yesterday', { date: y });
  dismissRecovery();
}

export function dismissRecovery() {
  useData.getState().commit('dismiss-recovery', null, () => ({ recoveryDismissed: todayKey() }));
}

function patchHabit(id: string, op: string, fn: (h: Habit) => Habit) {
  const d = getData();
  useData.getState().commit(op, { id }, () => ({ habits: d.habits.map((h) => (h.id === id ? fn(h) : h)) }));
}

export function togglePause(id: string) {
  const h = find(id);
  if (!h) return;
  const today = todayKey();
  const snap = { habits: getData().habits, log: getData().log, xp: getData().xp };
  patchHabit(id, h.paused ? 'resume' : 'pause', (x) => ({
    ...x,
    paused: !x.paused,
    pauses: x.paused ? x.pauses.map((p) => (p.to === null ? { ...p, to: today } : p)) : [...x.pauses, { from: today, to: null }],
  }));
  useUI.getState().openSheet(null);
  useUI.getState().toast(h.paused ? h.name + ' resumed' : h.name + ' paused — hidden from Today', snap);
}

export function archive(id: string) {
  const h = find(id);
  if (!h) return;
  const snap = { habits: getData().habits, log: getData().log, xp: getData().xp };
  patchHabit(id, 'archive', (x) => ({ ...x, archived: true }));
  useUI.setState({ dialog: null, sheet: null });
  useUI.getState().toast(h.name + ' archived. History kept.', snap);
}

export function restoreArchived(id: string) {
  const h = find(id);
  if (!h) return;
  const snap = { habits: getData().habits, log: getData().log, xp: getData().xp };
  patchHabit(id, 'unarchive', (x) => ({ ...x, archived: false }));
  useUI.getState().toast(h.name + ' restored to Today', snap);
}

export function deleteHabit(id: string) {
  const d = getData();
  const h = find(id);
  if (!h) return;
  const snap = { habits: d.habits, log: d.log, xp: d.xp };
  const { [id]: _gone, ...log } = d.log;
  useData.getState().commit('delete', { id }, (s) => ({
    habits: s.habits.filter((x) => x.id !== id).map((x) => (x.stackAfter === id ? { ...x, stackAfter: null } : x)),
    log,
    routines: s.routines.map((r) => ({ ...r, steps: r.steps.filter((x) => x !== id) })),
  }));
  useUI.setState({ dialog: null, sheet: null });
  useUI.getState().toast(h.name + ' deleted', snap);
}

export interface HabitForm {
  mode: 'create' | 'edit';
  id?: string;
  name: string;
  icon: string;
  type: HabitType;
  target: number;
  unit: string;
  dur: number;
  sched: 'Every day' | 'Weekdays' | 'Pick days' | 'Per week';
  days: boolean[];
  perWeek: number;
  time: TimeOfDay;
  cat: Category;
  rem: boolean;
  remTime: string;
  more: boolean;
  grace: boolean;
  smartRem: boolean;
  stack: string;
}

export function blankForm(type: HabitType = 'bool'): HabitForm {
  return {
    mode: 'create', name: '', icon: 'check', type, target: 8, unit: 'glasses', dur: 10, sched: 'Every day',
    days: [true, false, true, false, true, false, false], perWeek: 3, time: 'Anytime', cat: 'Health',
    rem: false, remTime: '08:00', more: false, grace: true, smartRem: false, stack: '',
  };
}

export function formFor(h: Habit): HabitForm {
  const s = currentSchedule(h);
  return {
    mode: 'edit', id: h.id, name: h.name, icon: h.icon, type: h.type,
    target: h.type === 'qty' ? h.target : 8, unit: h.type === 'qty' ? h.unit : 'glasses', dur: h.type === 'dur' ? h.target : 10,
    sched: s.kind === 'daily' ? 'Every day' : s.kind === 'weekdays' ? 'Weekdays' : s.kind === 'perWeek' ? 'Per week' : 'Pick days',
    days: s.kind === 'days' ? s.days : [true, false, true, false, true, false, false],
    perWeek: s.kind === 'perWeek' ? s.n : 3, time: h.time, cat: h.cat, rem: !!h.reminder, remTime: h.reminder ?? '08:00',
    more: false, grace: h.grace, smartRem: h.smartReminder, stack: h.stackAfter ?? '',
  };
}

function scheduleOf(f: HabitForm): Schedule {
  if (f.sched === 'Weekdays') return { kind: 'weekdays' };
  if (f.sched === 'Pick days') return { kind: 'days', days: f.days };
  if (f.sched === 'Per week') return { kind: 'perWeek', n: f.perWeek };
  return { kind: 'daily' };
}

/** Returns the saved habit's id, or null when the form is incomplete. */
export function saveForm(f: HabitForm): string | null {
  const name = f.name.trim();
  if (!name) return null;
  const today = todayKey();
  const target = f.type === 'qty' ? f.target : f.type === 'dur' ? f.dur : 1;
  const base = {
    name, icon: f.icon, type: f.type, target, unit: f.type === 'qty' ? f.unit : f.type === 'dur' ? 'min' : '',
    step: f.type === 'qty' ? stepFor(target) : 1, time: f.time, cat: f.cat, reminder: f.rem ? f.remTime : null,
    smartReminder: f.smartRem, grace: f.grace, stackAfter: f.stack || null,
  };
  const s = scheduleOf(f);
  if (f.mode === 'create') {
    const h: Habit = { ...base, id: uid(), schedules: [{ from: today, s }], est: f.type === 'dur' ? target : 5, paused: false, pauses: [], archived: false, createdAt: today };
    useData.getState().commit('create', { id: h.id }, (d) => ({ habits: [...d.habits, h] }));
    useUI.getState().toast(h.name + ' added to ' + h.time);
    return h.id;
  }
  patchHabit(f.id!, 'edit', (h) => {
    const changed = JSON.stringify(currentSchedule(h)) !== JSON.stringify(s);
    const schedules = !changed ? h.schedules : [...h.schedules.filter((v) => v.from < today), { from: today, s }];
    return { ...h, ...base, schedules, est: f.type === 'dur' ? target : h.est };
  });
  useUI.getState().toast('Saved. The new schedule starts today — history is unchanged.');
  return f.id!;
}

// — routines —

export function createRoutine(name: string, time: string, steps: string[]): string | null {
  if (!name.trim() || !steps.length) return null;
  const r: Routine = { id: uid('r'), name: name.trim(), time, steps };
  useData.getState().commit('routine-create', r, (d) => ({ routines: [...d.routines, r] }));
  useUI.getState().toast('Routine created');
  return r.id;
}

export function moveStep(rid: string, k: number, dir: -1 | 1) {
  useData.getState().commit('routine-move', { rid, k, dir }, (d) => ({
    routines: d.routines.map((r) => {
      if (r.id !== rid) return r;
      const s = [...r.steps];
      const j = k + dir;
      if (j < 0 || j >= s.length) return r;
      [s[k], s[j]] = [s[j], s[k]];
      return { ...r, steps: s };
    }),
  }));
}

/** Marks a routine step done (quietly — the run screen is the feedback). */
export function completeStep(id: string) {
  const d = getData();
  const h = find(id);
  if (!h || h.type === 'avoid' || isDoneOn(h, d.log, todayKey(), todayKey())) return;
  if (h.type === 'qty') increment(id, 1, { quiet: true });
  else change(id, 'complete', (x) => ({ ...(x ?? {}), v: h.type === 'bool' ? 1 : h.target, skip: false }), null, { quiet: true });
}

export function recordRun(routineId: string, results: ('d' | 's')[]) {
  useData.getState().commit('routine-run', { routineId, results }, (d) => ({ runs: [...d.runs, { routineId, date: todayKey(), results }] }));
}

// — timer —

export function timerElapsedMin(t: { accumulatedMs: number; startedAt: number | null }, now = Date.now()): number {
  return (t.accumulatedMs + (t.startedAt ? now - t.startedAt : 0)) / 60000;
}

export function startTimer(id: string) {
  const h = find(id);
  if (!h) return;
  const today = todayKey();
  const d = getData();
  const cur = d.timer;
  if (cur && cur.habitId === id && cur.date === today && !cur.done) return;
  const already = d.log[id]?.[today]?.v ?? 0;
  useData.getState().commit('timer-start', { id }, () => ({
    timer: { habitId: id, date: today, targetMin: h.target, accumulatedMs: already * 60000, startedAt: Date.now(), done: false },
  }));
}

export function pauseTimer() {
  const t = getData().timer;
  if (!t || !t.startedAt) return;
  useData.getState().commit('timer-pause', null, () => ({ timer: { ...t, accumulatedMs: t.accumulatedMs + Date.now() - t.startedAt!, startedAt: null } }));
}

export function resumeTimer() {
  const t = getData().timer;
  if (!t || t.startedAt || t.done) return;
  useData.getState().commit('timer-resume', null, () => ({ timer: { ...t, startedAt: Date.now() } }));
}

export function extendTimer(min: number) {
  const t = getData().timer;
  if (!t) return;
  useData.getState().commit('timer-extend', { min }, () => ({ timer: { ...t, targetMin: t.targetMin + min } }));
}

/** Called by the timer screen's clock once the target is reached. */
export function completeTimer() {
  const t = getData().timer;
  if (!t || t.done) return;
  change(t.habitId, 'timer-complete', (x) => ({ ...(x ?? {}), v: t.targetMin, skip: false }), null, { date: t.date });
  useData.getState().commit('timer-done', null, () => ({ timer: { ...t, accumulatedMs: t.targetMin * 60000, startedAt: null, done: true } }));
}

export function finishEarly() {
  const t = getData().timer;
  if (!t) return;
  const h = find(t.habitId);
  const v = Math.max(1, Math.round(timerElapsedMin(t)));
  setValue(t.habitId, v, { date: t.date }, `Logged ${v} of ${h?.target ?? t.targetMin} min — partial counts`);
  useData.getState().commit('timer-clear', null, () => ({ timer: null }));
}

export function closeTimer() {
  const t = getData().timer;
  if (t && !t.done && t.startedAt) pauseTimer();
  if (t?.done) useData.getState().commit('timer-clear', null, () => ({ timer: null }));
}

// — settings, reviews, data —

export function setSettings(p: Partial<Settings>) {
  useData.getState().commit('settings', p, (d) => ({ settings: { ...d.settings, ...p } }));
}

export function saveReview(date: DateKey, helped: string, blocked: string) {
  useData.getState().commit('review', { date }, (d) => ({ reviews: { ...d.reviews, [date]: { helped, blocked } } }));
}

export function finishOnboarding(ids: string[], reminders: 0 | 1 | 2) {
  const today = todayKey();
  const habits = ids.map((id) => STARTERS.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s).map((s) => habitFromStarter(s, today, uid()));
  useData.getState().commit('onboard', { ids, reminders }, (d) => ({
    onboarded: true,
    habits,
    settings: { ...d.settings, morningSummary: reminders === 0, remindersOn: reminders !== 2 },
  }));
  useUI.getState().toast(habits.length ? "You're set. Tap a habit when it's done." : 'Add your first habit whenever you like.');
}

export function loadSample() {
  const s = sampleData(todayKey());
  useData.getState().commit('sample', null, (d) => ({ ...s, onboarded: true, settings: d.settings }));
}

export function resetAll() {
  useData.getState().replace({ ...EMPTY });
}

export function statusToday(h: Habit, log: Log) {
  const t = todayKey();
  return statusOn(h, log, t, t);
}
