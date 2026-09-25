import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Strip } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { Fab } from '@/components/today';
import { AppBar, Label, Page, Txt } from '@/components/ui';
import { CATS, TYPE_LABEL } from '@/domain/catalog';
import { addDays, range } from '@/domain/dates';
import { currentSchedule, momentumOf, scheduleLabel, statusOn, streakOf } from '@/domain/status';
import { togglePause } from '@/store/actions';
import { useData } from '@/store/data';
import { useHabitSets, useStreakOpts, useToday } from '@/store/hooks';
import { useT } from '@/theme';

export default function HabitsScreen() {
  const { p } = useT();
  const router = useRouter();
  const today = useToday();
  const opts = useStreakOpts();
  const { all } = useHabitSets();
  const log = useData((s) => s.log);
  const mom = useData((s) => s.settings.recovery === 'Momentum');
  const days = range(addDays(today, -6), today);
  const groups = CATS.map((c) => ({ title: c, items: all.filter((h) => h.cat === c && !h.paused) })).filter((g) => g.items.length);
  const paused = all.filter((h) => h.paused);

  return (
    <View style={{ flex: 1 }}>
      <Page bar={<AppBar title="Habits" right={<Txt size={11} color={p.mu} style={{ paddingRight: 16 }}>Last 7 days</Txt>} />} contentStyle={{ paddingBottom: 96 }}>
        {!all.length && <Txt size={13} color={p.mu} lh={1.5} style={{ padding: 20 }}>No habits yet. Tap + to add your first — small and specific works best.</Txt>}
        {groups.map((g) => (
          <View key={g.title}>
            <Label style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 4 }}>{g.title}</Label>
            {g.items.map((h) => {
              const s = streakOf(h, log, today, opts);
              return (
                <Pressable key={h.id} accessibilityRole="button" accessibilityLabel={h.name} onPress={() => router.push(`/habit/${h.id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 20, paddingRight: 16, backgroundColor: pressed ? p.sf : 'transparent' })}>
                  <Icon name={h.icon} size={19} color={p.tx} style={{ width: 22 }} />
                  <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    <Txt size={13.5} w={500} numberOfLines={1}>{h.name}</Txt>
                    <Txt size={11} color={p.mu}>{scheduleLabel(currentSchedule(h))} · {TYPE_LABEL[h.type]}</Txt>
                  </View>
                  <View style={{ width: 82 }}>
                    <Strip cells={days.map((k) => statusOn(h, log, k, today))} height={10} gap={2} r={3} sw={1} />
                  </View>
                  <Txt size={13} w={500} tab align="right" style={{ width: 34 }}>{mom ? momentumOf(h, log, today) + '%' : s.current}</Txt>
                </Pressable>
              );
            })}
          </View>
        ))}
        {paused.length > 0 && (
          <View>
            <Label style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 4 }}>Paused</Label>
            {paused.map((h) => (
              <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 20, paddingRight: 16 }}>
                <Icon name={h.icon} size={19} color={p.mu} />
                <Txt size={13.5} color={p.mu} style={{ flex: 1 }}>{h.name}</Txt>
                <Pressable accessibilityRole="button" accessibilityLabel={'Resume ' + h.name} onPress={() => togglePause(h.id)} style={{ height: 36, paddingHorizontal: 12, borderWidth: 1, borderColor: p.ln2, borderRadius: 14, justifyContent: 'center' }}>
                  <Txt size={11.5} w={500}>Resume</Txt>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Page>
      <Fab onPress={() => router.push('/habit/form')} />
    </View>
  );
}
