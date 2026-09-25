// Plain data for the home-screen widgets, computed from the local store.

import { short } from '@/domain/goals';
import { todayKey } from '@/domain/dates';
import { isDoneOn, streakOf } from '@/domain/status';
import type { Habit } from '@/domain/types';
import { streakOpts } from '@/store/actions';
import type { Data } from '@/store/data';
import { buildPalette, type Palette } from '@/theme/palette';

export interface WidgetModel {
  p: Palette;
  done: number;
  total: number;
  pct: string;
  segs: boolean[];
  pending: { id: string; name: string; val: string; action: 'check' | 'plus' | 'play' }[];
  streaks: { n: number; name: string }[];
  quick: { id: string; label: string; val: string }[];
}

const valText = (h: Habit, v: number) => (h.type === 'qty' ? short(v) + '/' + short(h.target) : h.type === 'dur' ? h.target + 'm' : '');

export function widgetModel(d: Data): WidgetModel {
  const today = todayKey();
  const act = d.habits.filter((h) => !h.archived && !h.paused);
  const done = act.filter((h) => isDoneOn(h, d.log, today, today));
  const pending = act
    .filter((h) => h.type !== 'avoid' && !isDoneOn(h, d.log, today, today) && !d.log[h.id]?.[today]?.skip)
    .slice(0, 4)
    .map((h) => ({ id: h.id, name: h.name, val: valText(h, d.log[h.id]?.[today]?.v ?? 0), action: (h.type === 'qty' ? 'plus' : h.type === 'dur' ? 'play' : 'check') as 'check' | 'plus' | 'play' }));
  const streaks = act
    .map((h) => ({ h, s: streakOf(h, d.log, today, streakOpts(d)) }))
    .filter((x) => x.s.unit === 'days')
    .sort((a, b) => b.s.current - a.s.current)
    .slice(0, 2)
    .map((x) => ({ n: x.s.current, name: x.h.name }));
  const quick = act
    .filter((h) => h.type === 'qty')
    .slice(0, 3)
    .map((h) => ({ id: h.id, label: '+' + short(h.step) + ' ' + (h.step === 1 ? h.unit.replace(/s$/, '') : h.unit), val: valText(h, d.log[h.id]?.[today]?.v ?? 0) }));
  return {
    p: buildPalette(d.settings.theme === 'Light' ? 'Light' : 'Dark', d.settings.accent),
    done: done.length,
    total: act.length,
    pct: act.length ? Math.round((done.length / act.length) * 100) + '%' : '0%',
    segs: act.map((h) => isDoneOn(h, d.log, today, today)),
    pending,
    streaks,
    quick,
  };
}
