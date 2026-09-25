import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Bars } from '@/components/charts';
import { AppBar, Btn, Card, GlowFill, Label, Page, Txt } from '@/components/ui';
import { fmtGoal, goalView } from '@/domain/goals';
import { useData } from '@/store/data';
import { useToday } from '@/store/hooks';
import { useT } from '@/theme';

export default function GoalDetail() {
  const { p } = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const g = useData((s) => s.goals.find((x) => x.id === id));
  const habits = useData((s) => s.habits);
  const log = useData((s) => s.log);
  if (!g) return <Page bar={<AppBar />}><Txt style={{ padding: 20 }}>This goal is gone.</Txt></Page>;
  const h = habits.find((x) => x.id === g.habitId);
  const v = goalView(g, h, log, today);
  const mx = Math.max(...v.months.map((m) => m.v), 0.0001);
  return (
    <Page bar={<AppBar />}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 6 }}>
        <Txt size={12} color={p.mu}>{g.name}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <Txt size={63} w={300} ls={-0.05} lh={0.9} tab>{fmtGoal(v.cur, g.unit)}</Txt>
          <Txt size={13} color={p.mu} style={{ paddingBottom: 4 }}>of {fmtGoal(g.target, g.unit)} {g.unit}</Txt>
        </View>
      </View>
      <View style={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={{ height: 12, borderRadius: 99, backgroundColor: p.sf2 }}>
          <GlowFill style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v.frac * 100}%` }} />
          <View style={{ position: 'absolute', top: -6, bottom: -6, left: `${v.pace * 100}%`, width: 2, borderRadius: 3, backgroundColor: p.tx }} />
          {v.milestones.map((m) => (
            <View key={m.x} style={{ position: 'absolute', top: 0, left: `${m.x * 100}%`, marginLeft: -14, width: 12, height: 12, borderWidth: 1, borderColor: p.ln2, borderRadius: 8, backgroundColor: m.got ? p.ac : p.bg }} />
          ))}
        </View>
        <View style={{ height: 16, marginTop: 10 }}>
          {v.milestones.map((m) => (
            <Txt key={m.x} size={10.5} w={500} color={p.mu} numberOfLines={1} align="right" style={{ position: 'absolute', right: `${(1 - m.x) * 100}%`, width: 64 }}>{fmtGoal(m.v, g.unit)}</Txt>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 1, backgroundColor: p.ln, marginHorizontal: 16, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden' }}>
        <Card radius={10} style={{ flex: 1, paddingVertical: 12, paddingRight: 14, paddingLeft: 20, gap: 2 }}>
          <Txt size={11} color={p.mu}>Expected finish</Txt>
          <Txt size={20} w={500}>{v.eta}</Txt>
        </Card>
        <Card radius={10} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 2 }}>
          <Txt size={11} color={p.mu}>Remaining</Txt>
          <Txt size={20} w={500}>{fmtGoal(v.left, g.unit)} {g.unit} to go</Txt>
        </Card>
      </View>
      <View style={{ padding: 16, paddingHorizontal: 20, gap: 8 }}>
        <Label>By month · {v.perMonth}</Label>
        <Bars values={v.months.map((m) => m.v / mx)} height={100} gap={6} track={false} colors={v.months.map((m) => (m.current ? p.ac : p.bar))} labels={v.months.map((m) => m.label)} labelSize={10.5} />
        <Txt size={12.5} lh={1.45} style={{ marginTop: 4 }}>{v.note}</Txt>
        {h && <Btn label={`Fed by: ${h.name}`} icon="arrow-right" style={{ marginTop: 6, paddingHorizontal: 14 }} onPress={() => router.push(`/habit/${h.id}`)} />}
      </View>
    </Page>
  );
}
