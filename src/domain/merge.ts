// Merging this phone's data with the copy kept in Google Drive. Nothing is
// ever thrown away blindly: both sides are combined, and where the same
// thing changed on both, the newer edit wins.

import type { Entry, Goal, Habit, Log, Profile, Review, Routine, RoutineRun } from './types';

/** The part of local data that travels to the cloud. Settings stay per-device. */
export interface SyncPayload {
  onboarded: boolean;
  habits: Habit[];
  log: Log;
  routines: Routine[];
  runs: RoutineRun[];
  goals: Goal[];
  reviews: Record<string, Review>;
  xp: number;
  profile: Profile;
  deleted: Record<string, number>;
}

export const EMPTY_PROFILE: Profile = { name: '', age: null, gender: null, email: null, photo: null, updatedAt: 0 };

const entryTime = (e: Entry) => e.u ?? e.at ?? 0;

function unionById<T extends { id: string }>(local: T[], remote: T[], pick: (a: T, b: T) => T): T[] {
  const out = new Map<string, T>();
  for (const x of remote) out.set(x.id, x);
  for (const x of local) {
    const r = out.get(x.id);
    out.set(x.id, r ? pick(x, r) : x);
  }
  // Keep local order first, then anything that only exists remotely.
  const order = [...local.map((x) => x.id), ...remote.map((x) => x.id).filter((id) => !local.some((l) => l.id === id))];
  return order.map((id) => out.get(id)!);
}

export function merge(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const deleted: Record<string, number> = { ...remote.deleted };
  for (const [id, t] of Object.entries(local.deleted)) deleted[id] = Math.max(t, deleted[id] ?? 0);

  const habits = unionById(local.habits, remote.habits, (a, b) => ((b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a)).filter(
    (h) => !(deleted[h.id] && deleted[h.id] >= (h.updatedAt ?? 0)),
  );
  const alive = new Set(habits.map((h) => h.id));

  const log: Log = {};
  for (const id of alive) {
    const a = local.log[id] ?? {};
    const b = remote.log[id] ?? {};
    const days: Log[string] = { ...b };
    for (const [k, e] of Object.entries(a)) {
      const r = b[k];
      days[k] = !r || entryTime(e) >= entryTime(r) ? e : r;
    }
    if (Object.keys(days).length) log[id] = days;
  }

  const routines = unionById(local.routines, remote.routines, (a) => a).map((r) => ({ ...r, steps: r.steps.filter((s) => alive.has(s)) }));
  const goals = unionById(local.goals, remote.goals, (a) => a).filter((g) => alive.has(g.habitId));

  const runKey = (r: RoutineRun) => `${r.routineId}|${r.date}|${r.results.join('')}`;
  const runs = [...new Map([...remote.runs, ...local.runs].map((r) => [runKey(r), r])).values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  return {
    onboarded: local.onboarded || remote.onboarded,
    habits,
    log,
    routines,
    runs,
    goals,
    reviews: { ...remote.reviews, ...local.reviews },
    xp: Math.max(local.xp, remote.xp),
    profile: remote.profile.updatedAt > local.profile.updatedAt ? { ...remote.profile, email: local.profile.email ?? remote.profile.email, photo: local.profile.photo ?? remote.profile.photo } : local.profile,
    deleted,
  };
}
