import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { todayKey } from '@/domain/dates';
import type { StreakOpts } from '@/domain/status';
import type { DateKey } from '@/domain/types';
import { useData } from './data';

/** Today's key, refreshed at midnight and whenever the app comes back to the foreground. */
export function useToday(): DateKey {
  const [k, setK] = useState(todayKey());
  useEffect(() => {
    const tick = () => setK(todayKey());
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5).getTime() - now.getTime();
    const t = setTimeout(tick, ms);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [k]);
  return k;
}

/** Non-archived habits (all) and the ones on Today (active: also not paused). */
export function useHabitSets() {
  const habits = useData((s) => s.habits);
  return useMemo(() => {
    const all = habits.filter((h) => !h.archived);
    return { all, act: all.filter((h) => !h.paused) };
  }, [habits]);
}

export function useStreakOpts() {
  const graceN = useData((s) => s.settings.graceN);
  const weekStart = useData((s) => s.settings.weekStart);
  return useMemo<StreakOpts>(() => ({ graceN, weekStart }), [graceN, weekStart]);
}
