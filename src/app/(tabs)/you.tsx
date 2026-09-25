import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Bar, Card, Note, Page, Row, Txt } from '@/components/ui';
import { XP_PER_LEVEL } from '@/domain/catalog';
import { addDays } from '@/domain/dates';
import { achievements, goalView, fmtNum } from '@/domain/goals';
import { isDoneOn, rate } from '@/domain/status';
import { useData } from '@/store/data';
import { useHabitSets, useStreakOpts, useToday } from '@/store/hooks';
import { useT } from '@/theme';

export default function YouScreen() {
  const { p } = useT();
  const router = useRouter();
  const today = useToday();
  const { all, act } = useHabitSets();
  const d = useData();
  const opts = useStreakOpts();
  const lvl = Math.floor(d.xp / XP_PER_LEVEL) + 1;

  const tiles = useMemo(() => {
    const r30 = Math.round(rate(act, d.log, addDays(today, -29), today, today) * 100);
    const goals = d.goals.map((g) => goalView(g, d.habits.find((h) => h.id === g.habitId), d.log, today));
    const gAvg = goals.length ? Math.round((goals.reduce((a, g) => a + g.frac, 0) / goals.length) * 100) : 0;
    const ach = achievements(d.habits.filter((h) => !h.archived), d.log, d.runs, d.routines, today, opts);
    const got = ach.filter((a) => a.got).length;
    const doneToday = act.filter((h) => isDoneOn(h, d.log, today, today)).length;
    return [
      { t: 'Habits', s: all.length + ' active', ic: 'list-checks', to: '/habits', w: act.length ? doneToday / act.length : 0 },
      { t: 'Goals', s: d.goals.length + ' in progress', ic: 'target', to: '/goals', w: gAvg / 100 },
      { t: 'History', s: '30-day rate ' + r30 + '%', ic: 'clock-counter-clockwise', to: '/history', w: r30 / 100 },
      { t: 'Achievements', s: got + ' of ' + ach.length, ic: 'trophy', to: '/achievements', w: got / ach.length },
    ] as const;
  }, [act, all.length, d.log, d.goals, d.habits, d.runs, d.routines, today, opts]);

  const archived = d.habits.filter((h) => h.archived).length;
  const rows: [string, string, string, Href][] = [
    ['Daily review', 'Reflect on today', 'notebook', '/review'],
    ['Appearance', 'Theme, accent, density, layout', 'palette', '/settings/appearance'],
    ['Reminders', 'Times, quiet hours, actions', 'bell', '/settings/reminders'],
    ['Streaks & rewards', 'Grace days, XP, achievements', 'fire', '/settings/streaks'],
    ['Data & backup', 'Export, backup, restore', 'hard-drives', '/settings/data'],
    ['Archived habits', archived + ' archived', 'archive', '/archived'],
  ];

  return (
    <Page>
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: p.act, alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0px 0px 0px 1px ${p.ac}` }}>
            <Icon name="user" size={24} color={p.acx} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={24} w={500} ls={-0.025} accessibilityRole="header">You</Txt>
            <Txt size={12} color={p.mu}>No account · this phone only</Txt>
          </View>
        </View>
        {d.settings.xpOn && (
          <View style={{ gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: p.ln2, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Txt size={13.5} w={500}>Level {lvl}</Txt>
              <Txt size={11.5} color={p.mu} tab>{fmtNum(d.xp)} XP · {lvl * XP_PER_LEVEL - d.xp} to next</Txt>
            </View>
            <Bar v={(d.xp % XP_PER_LEVEL) / XP_PER_LEVEL} height={8} />
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: p.ln, marginHorizontal: 16, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden' }}>
        {tiles.map((t) => (
          <Pressable key={t.t} accessibilityRole="button" accessibilityLabel={`${t.t}, ${t.s}`} onPress={() => router.push(t.to)} style={{ flexBasis: '49%', flexGrow: 1 }}>
            {({ pressed }) => (
              <Card radius={12} active={pressed} style={{ height: 112, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'space-between' }}>
                <Icon name={t.ic} size={22} color={p.tx} />
                <View style={{ gap: 2 }}>
                  <Txt size={13.5} w={500}>{t.t}</Txt>
                  <Txt size={11} color={p.mu}>{t.s}</Txt>
                  <Bar v={t.w} height={3} style={{ marginTop: 4 }} />
                </View>
              </Card>
            )}
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: 6 }}>
        {rows.map(([t, s, ic, to]) => (
          <Row key={t} icon={ic} title={t} sub={s} onPress={() => router.push(to)} />
        ))}
      </View>

      <View style={{ marginTop: 16, marginHorizontal: 20 }}>
        <Note icon="lock">Your data stays on this device. HabitFlow works fully offline and never asks for an account.</Note>
      </View>
    </Page>
  );
}
