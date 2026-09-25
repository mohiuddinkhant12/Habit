import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppBar, GlowFill, Page, Txt } from '@/components/ui';
import { fmtGoal, goalView } from '@/domain/goals';
import { useData } from '@/store/data';
import { useToday } from '@/store/hooks';
import { useT } from '@/theme';

export default function Goals() {
  const { p } = useT();
  const router = useRouter();
  const today = useToday();
  const goals = useData((s) => s.goals);
  const habits = useData((s) => s.habits);
  const log = useData((s) => s.log);
  return (
    <Page bar={<AppBar title={`Goals · ${today.slice(0, 4)}`} />}>
      {goals.map((g) => {
        const v = goalView(g, habits.find((h) => h.id === g.habitId), log, today);
        return (
          <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${g.name}, ${Math.round(v.frac * 100)}%, ${v.ahead ? 'ahead of pace' : 'behind pace'}`} onPress={() => router.push(`/goal/${g.id}`)} style={({ pressed }) => ({ gap: 8, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: pressed ? p.sf : 'transparent' })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Txt size={15.5} w={500}>{g.name}</Txt>
              <Txt size={20} w={500} tab>{Math.round(v.frac * 100)}%</Txt>
            </View>
            <View style={{ height: 10, borderRadius: 99, backgroundColor: p.sf2 }}>
              <GlowFill style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v.frac * 100}%` }} />
              <View style={{ position: 'absolute', top: -4, bottom: -4, left: `${v.pace * 100}%`, width: 2, borderRadius: 3, backgroundColor: p.tx }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt size={11.5} color={p.mu}>
                {fmtGoal(v.cur, g.unit)} of {fmtGoal(g.target, g.unit)} {g.unit} · <Txt size={11.5} w={500} color={v.ahead ? p.acx : p.mu}>{v.ahead ? 'Ahead of pace' : 'Behind pace'}</Txt>
              </Txt>
              <Txt size={11.5} color={p.mu}>Expected {v.eta}</Txt>
            </View>
          </Pressable>
        );
      })}
      {goals.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 20 }}>
          <View style={{ width: 2, height: 12, borderRadius: 3, backgroundColor: p.tx }} />
          <Txt size={11} color={p.mu}>Line marks where an even pace would be today</Txt>
        </View>
      ) : (
        <View style={{ paddingVertical: 28, paddingHorizontal: 20, gap: 8 }}>
          <Txt size={20} w={500}>No goals yet.</Txt>
          <Txt size={12.5} lh={1.5} color={p.mu}>Goals add up a habit over the year — like 20 books from a daily reading habit. They fill in automatically from your check-ins.</Txt>
        </View>
      )}
    </Page>
  );
}
