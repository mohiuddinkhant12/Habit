import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { uid } from '@/domain/factory';
import { EMPTY_PROFILE } from '@/domain/merge';
import type { DateKey, Goal, Habit, Log, Op, Profile, Review, Routine, RoutineRun, Settings, SyncState, TimerSession } from '@/domain/types';

export const DATA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'Dark',
  accent: 'Blurple',
  density: 'Comfortable',
  reduceMotion: false,
  groupBy: 'Time of day',
  todayLayout: 'List',
  rowControl: 'Controls',
  recovery: 'Grace days',
  graceN: 1,
  weekStart: 'Monday',
  remindersOn: true,
  quietHours: true,
  smartTiming: true,
  routineReminders: true,
  eveningCatchUp: false,
  morningSummary: false,
  xpOn: true,
  achievementsOn: true,
  exportFormat: 'JSON',
  exportNotes: true,
};

/** Everything that lives on the device. Exported as-is for backups. */
export interface Data {
  version: number;
  onboarded: boolean;
  habits: Habit[];
  log: Log;
  routines: Routine[];
  runs: RoutineRun[];
  goals: Goal[];
  reviews: Record<DateKey, Review>;
  settings: Settings;
  xp: number;
  timer: TimerSession | null;
  recoveryDismissed: DateKey | null;
  lastBackup: number | null;
  profile: Profile;
  sync: SyncState;
  /** Deleted habit ids → when, so a sync never brings a deleted habit back. */
  deleted: Record<string, number>;
  /**
   * Append-only operation log. Every write lands here too, so a future sync
   * layer can replay local changes without the screens changing.
   */
  ops: Op[];
}

export const EMPTY_SYNC: SyncState = { autoSync: true, lastSyncAt: null, lastError: null, fileId: null };

export const EMPTY: Data = {
  version: DATA_VERSION,
  onboarded: false,
  habits: [],
  log: {},
  routines: [],
  runs: [],
  goals: [],
  reviews: {},
  settings: DEFAULT_SETTINGS,
  xp: 0,
  timer: null,
  recoveryDismissed: null,
  lastBackup: null,
  profile: EMPTY_PROFILE,
  sync: EMPTY_SYNC,
  deleted: {},
  ops: [],
};

const MAX_OPS = 2000;

interface Store extends Data {
  /** Apply a change and record it in the operation log. */
  commit: (op: string, payload: unknown, fn: (d: Data) => Partial<Data>) => void;
  replace: (d: Partial<Data>) => void;
}

export const useData = create<Store>()(
  persist(
    (set) => ({
      ...EMPTY,
      commit: (op, payload, fn) =>
        set((s) => {
          const patch = fn(s);
          const ops = [...s.ops, { id: uid('op'), ts: Date.now(), op, payload }];
          return { ...patch, ops: ops.length > MAX_OPS ? ops.slice(ops.length - MAX_OPS) : ops };
        }),
      replace: (d) => set(d),
    }),
    {
      name: 'habitflow',
      version: DATA_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ commit, replace, ...data }) => data,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          profile: { ...EMPTY_PROFILE, ...(p.profile ?? {}) },
          sync: { ...EMPTY_SYNC, ...(p.sync ?? {}) },
        };
      },
    },
  ),
);

export function getData(): Data {
  const { commit, replace, ...d } = useData.getState();
  return d;
}
