import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Btn, Label, Page, Rule, Txt } from '@/components/ui';
import { isDoneOn } from '@/domain/status';
import { useData } from '@/store/data';
import { useHabitSets, useToday } from '@/store/hooks';
import { useT } from '@/theme';

export default function RoutinesScreen() {
  const { p } = useT();
  const router = useRouter();
  const today = useToday();
  const routines = useData((s) => s.routines);
  const habits = useData((s) => s.habits);
  const log = useData((s) => s.log);
  const { all } = useHabitSets();
  const find = (id: string) => habits.find((h) => h.id === id && !h.archived);
  const stacks = all.filter((h) => h.stackAfter && find(h.stackAfter));

  return (
    <Page>
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 12, gap: 4 }}>
        <Txt size={24} ls={-0.025} accessibilityRole="header">Routines</Txt>
        <Txt size={12} color={p.mu}>Run habits in order, one at a time.</Txt>
      </View>

      {routines.length === 0 && (
        <View>
          <Rule />
          <View style={{ padding: 20, gap: 8 }}>
            <Txt size={20} w={500}>No routines yet.</Txt>
            <Txt size={12.5} lh={1.5} color={p.mu}>Group a few habits you already do back to back — a morning or wind-down routine — and run them one step at a time.</Txt>
          </View>
        </View>
      )}

      {routines.map((r) => {
        const hs = r.steps.map(find).filter((h): h is NonNullable<typeof h> => !!h);
        const done = hs.filter((h) => isDoneOn(h, log, today, today)).length;
        const mins = hs.reduce((a, h) => a + h.est, 0);
        const full = done === hs.length && hs.length > 0;
        return (
          <View key={r.id}>
            <Rule />
            <View style={{ paddingVertical: 16, paddingHorizontal: 20, gap: 12 }}>
              <Pressable accessibilityRole="button" onPress={() => router.push(`/routine/${r.id}`)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ gap: 3 }}>
                  <Txt size={22} w={500} ls={-0.025}>{r.name}</Txt>
                  <Txt size={12} color={p.mu}>{r.time} · {hs.length} steps · about {mins} min</Txt>
                </View>
                <Icon name="caret-right" size={20} color={p.tx} style={{ marginTop: 4 }} />
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {hs.map((h) => (
                  <View key={h.id} style={{ flex: 1, minWidth: 0, gap: 5 }}>
                    <View style={{ height: 6, borderRadius: 99, backgroundColor: isDoneOn(h, log, today, today) ? p.ac : p.sf2 }} />
                    <Txt size={11} color={p.mu} numberOfLines={1}>{h.name}</Txt>
                  </View>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/routine/run/${r.id}`)}
                style={({ pressed }) => ({ height: 44, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderWidth: 2, borderColor: full ? p.tx : p.ac, backgroundColor: full ? 'transparent' : p.ac, opacity: pressed ? 0.9 : 1 })}
              >
                <Txt size={13.5} w={500} color={full ? p.tx : p.onac}>{full ? 'Done today — run again' : done ? `Continue · ${done} of ${hs.length}` : 'Start routine'}</Txt>
                <Icon name="play" size={14.5} color={full ? p.tx : p.onac} />
              </Pressable>
            </View>
          </View>
        );
      })}

      <Rule />
      <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 8, gap: 4 }}>
        <Label>Habit stacks</Label>
        <Txt size={12} color={p.mu}>Anchor a new habit to one you already do.</Txt>
      </View>
      {stacks.map((h) => (
        <Pressable key={h.id} accessibilityRole="button" accessibilityLabel={`After ${find(h.stackAfter!)!.name}, do ${h.name}`} onPress={() => router.push(`/habit/${h.id}`)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 }}>
          <View style={{ flex: 1, height: 48, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: p.ln2, borderRadius: 8 }}>
            <Txt size={10.5} ls={0.06} upper color={p.mu}>After</Txt>
            <Txt size={12.5} w={500} numberOfLines={1}>{find(h.stackAfter!)!.name}</Txt>
          </View>
          <View style={{ width: 28, height: 2, borderRadius: 99, backgroundColor: p.ac, justifyContent: 'center' }}>
            <Icon name="caret-right" size={14.5} color={p.ac} style={{ position: 'absolute', right: -6 }} />
          </View>
          <View style={{ flex: 1, height: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, backgroundColor: p.act }}>
            <Txt size={10.5} ls={0.06} upper color={p.acx} style={{ opacity: 0.7 }}>Do</Txt>
            <Txt size={12.5} w={500} color={p.acx} numberOfLines={1}>{h.name}</Txt>
          </View>
        </Pressable>
      ))}
      {!stacks.length && <Txt size={12} color={p.mu} lh={1.5} style={{ paddingHorizontal: 20, paddingBottom: 4 }}>None yet. Edit a habit and pick “do it right after” under More options.</Txt>}
      <View style={{ paddingVertical: 12, paddingHorizontal: 20 }}>
        <Btn label="New routine" icon="plus" onPress={() => router.push('/routine/new')} />
      </View>
    </Page>
  );
}
