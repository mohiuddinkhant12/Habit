import { useMemo } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/Icon';
import { AppBar, Bar, Card, Page, Txt } from '@/components/ui';
import { achievements, fmtNum } from '@/domain/goals';
import { useData } from '@/store/data';
import { useStreakOpts, useToday } from '@/store/hooks';
import { useT } from '@/theme';

export default function Achievements() {
  const { p } = useT();
  const today = useToday();
  const opts = useStreakOpts();
  const habits = useData((s) => s.habits);
  const log = useData((s) => s.log);
  const runs = useData((s) => s.runs);
  const routines = useData((s) => s.routines);
  const on = useData((s) => s.settings.achievementsOn);
  const list = useMemo(() => achievements(habits.filter((h) => !h.archived), log, runs, routines, today, opts), [habits, log, runs, routines, today, opts]);
  return (
    <Page bar={<AppBar title="Achievements" />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: p.ln, marginHorizontal: 16, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden', opacity: on ? 1 : 0.5 }}>
        {list.map((a) => (
          <Card key={a.n} radius={12} active={a.got} style={{ flexBasis: '49%', flexGrow: 1, padding: 14, minHeight: 136, gap: 6 }}>
            <View accessible accessibilityLabel={`${a.n}. ${a.d}. ${a.got ? 'Earned' : `${a.p} of ${a.t}`}`} style={{ flex: 1, gap: 6 }}>
              <Icon name={a.icon} size={24} color={a.got ? p.acx : p.tx} />
              <View style={{ flex: 1 }} />
              <Txt size={13.5} w={500} color={a.got ? p.acx : p.tx}>{a.n}</Txt>
              <Txt size={11} lh={1.35} color={a.got ? p.acx : p.mu}>{a.d}</Txt>
              <Bar v={a.p / a.t} height={3} />
              <Txt size={10.5} w={500} color={a.got ? p.acx : p.tx}>{a.got ? 'Earned' : `${fmtNum(a.p)} / ${fmtNum(a.t)}`}</Txt>
            </View>
          </Card>
        ))}
      </View>
      <Txt size={11.5} lh={1.5} color={p.mu} style={{ paddingVertical: 14, paddingHorizontal: 20 }}>
        {on ? 'Achievements mark consistency, never volume. Turn them off in Streaks & rewards.' : 'Achievements are off. Turn them back on in Streaks & rewards.'}
      </Txt>
    </Page>
  );
}
