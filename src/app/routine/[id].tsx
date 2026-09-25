import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Cell, Segments, Strip } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { AppBar, Btn, IconBtn, Label, Page, Rule, Txt } from '@/components/ui';
import { addDays, range } from '@/domain/dates';
import { isDoneOn, rate, statusOn } from '@/domain/status';
import type { Status } from '@/domain/types';
import { moveStep } from '@/store/actions';
import { useData } from '@/store/data';
import { useToday } from '@/store/hooks';
import { useT } from '@/theme';

export default function RoutineDetail() {
  const { p } = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const r = useData((s) => s.routines.find((x) => x.id === id));
  const habits = useData((s) => s.habits);
  const log = useData((s) => s.log);
  const hs = useMemo(() => (r ? r.steps.map((sid) => habits.find((h) => h.id === sid && !h.archived)).filter((h): h is NonNullable<typeof h> => !!h) : []), [r, habits]);

  const strip = useMemo(
    () =>
      range(addDays(today, -29), today).map((k): Status => {
        const ss = hs.map((h) => statusOn(h, log, k, today)).filter((s) => s !== 'o' && s !== 'n');
        const d = ss.filter((s) => s === 'd').length;
        return !ss.length ? 'o' : d === ss.length ? 'd' : d ? 'p' : 'm';
      }),
    [hs, log, today],
  );

  if (!r) return <Page bar={<AppBar />}><Txt style={{ padding: 20 }}>This routine is gone.</Txt></Page>;
  const mins = hs.reduce((a, h) => a + h.est, 0);
  const [h0, m0] = r.time.split(':').map(Number);
  const startAt = hs.map((_, k) => {
    const t = h0 * 60 + m0 + hs.slice(0, k).reduce((a, x) => a + x.est, 0);
    return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  });

  return (
    <Page bar={<AppBar />}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 14, gap: 4 }}>
        <Txt size={24} w={500} ls={-0.025} accessibilityRole="header">{r.name}</Txt>
        <Txt size={12} color={p.mu}>Starts {r.time} · {hs.length} steps · about {mins} min</Txt>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 14, gap: 6 }}>
        <Segments height={22} parts={hs.map((h, k) => ({ w: h.est / Math.max(1, mins), color: k % 2 ? p.bar : p.ac }))} />
        <Txt size={11} color={p.mu}>Time per step</Txt>
      </View>
      <Rule />
      {hs.map((h, k) => {
        const at = startAt[k];
        return (
          <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 20, paddingRight: 8 }}>
            <Txt size={11.5} color={p.mu} tab style={{ width: 38 }}>{at}</Txt>
            <Cell s={isDoneOn(h, log, today, today) ? 'd' : 'n'} size={14} />
            <Icon name={h.icon} size={16.5} color={p.tx} />
            <View style={{ flex: 1 }}>
              <Txt size={13.5} w={500}>{h.name}</Txt>
              <Txt size={11.5} color={p.mu}>{h.est} min</Txt>
            </View>
            <IconBtn icon="caret-up" label={`Move ${h.name} up`} size={14.5} onPress={() => moveStep(r.id, k, -1)} style={{ width: 40, opacity: k === 0 ? 0.3 : 1 }} />
            <IconBtn icon="caret-down" label={`Move ${h.name} down`} size={14.5} onPress={() => moveStep(r.id, k, 1)} style={{ width: 40, opacity: k === hs.length - 1 ? 0.3 : 1 }} />
          </View>
        );
      })}
      <View style={{ padding: 16, paddingHorizontal: 20, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label>Last 30 days</Label>
          <Label>{Math.round(rate(hs, log, addDays(today, -29), today, today) * 100)}%</Label>
        </View>
        <Strip cells={strip} height={20} r={5} sw={1} />
      </View>
      <View style={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 }}>
        <Btn variant="primary" label="Start routine" icon="play" size={14.5} onPress={() => router.push(`/routine/run/${r.id}`)} />
      </View>
    </Page>
  );
}
