import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Cell } from '@/components/charts';
import { STATUS_LABEL, valFor } from '@/components/habitVM';
import { Icon } from '@/components/Icon';
import { AppBar, Chip, Page, Rule, Txt } from '@/components/ui';
import { addDays, longD, range } from '@/domain/dates';
import { statusOn } from '@/domain/status';
import { useData } from '@/store/data';
import { useHabitSets, useToday } from '@/store/hooks';
import { useT } from '@/theme';

const FILTERS = ['All', 'Done', 'Partial', 'Skipped', 'Missed'] as const;

export default function History() {
  const { p } = useT();
  const today = useToday();
  const { act } = useHabitSets();
  const log = useData((s) => s.log);
  const [f, setF] = useState<(typeof FILTERS)[number]>('All');
  const days = range(addDays(today, -6), today)
    .reverse()
    .map((k) => ({
      k,
      items: act
        .map((h) => ({ h, s: statusOn(h, log, k, today) }))
        .filter((x) => x.s !== 'o' && x.s !== 'n' && (f === 'All' || STATUS_LABEL[x.s] === f)),
    }))
    .filter((d) => d.items.length);
  return (
    <Page bar={<AppBar title="History" />} stickyHeaderIndices={[]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20, paddingBottom: 12 }}>
        {FILTERS.map((o) => <Chip key={o} label={o} sel={f === o} onPress={() => setF(o)} />)}
      </ScrollView>
      {days.map((d) => (
        <View key={d.k}>
          <Rule />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 4 }}>
            <Txt size={13} w={500}>{longD(d.k, today)}</Txt>
            <Txt size={11} color={p.mu}>{d.items.length} entries</Txt>
          </View>
          {d.items.map(({ h, s }) => (
            <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 20 }}>
              <Cell s={s} size={14} />
              <Icon name={h.icon} size={13.5} color={p.mu} />
              <Txt size={12.5} style={{ flex: 1 }}>{h.name}</Txt>
              <Txt size={12} color={p.mu}>{valFor(h, s, log[h.id]?.[d.k]?.v)}</Txt>
            </View>
          ))}
        </View>
      ))}
      {!days.length && <Txt size={13} lh={1.5} color={p.mu} style={{ paddingVertical: 28, paddingHorizontal: 20 }}>No entries match this filter in the last 7 days — which may well be good news.</Txt>}
    </Page>
  );
}
