import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Cell } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { AppBar, Btn, Label, Page, Rule, Txt } from '@/components/ui';
import { DOW_LONG, weekdayOf } from '@/domain/dates';
import { currentSchedule, momentumOf, statusOn, streakOf, weekDoneOf } from '@/domain/status';
import { saveReview } from '@/store/actions';
import { useData } from '@/store/data';
import { useHabitSets, useStreakOpts, useToday } from '@/store/hooks';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';
import { font } from '@/theme/tokens';

export default function Review() {
  const { p } = useT();
  const router = useRouter();
  const today = useToday();
  const opts = useStreakOpts();
  const { act } = useHabitSets();
  const log = useData((s) => s.log);
  const settings = useData((s) => s.settings);
  const saved = useData((s) => s.reviews[today]);
  const [a, setA] = useState(saved?.helped ?? '');
  const [b, setB] = useState(saved?.blocked ?? '');
  const sts = act.map((h) => ({ h, s: statusOn(h, log, today, today) }));
  const done = sts.filter((x) => x.s === 'd');
  const skipped = sts.filter((x) => x.s === 's');
  const open = act.length - done.length - skipped.length;
  const mom = settings.recovery === 'Momentum';

  const field = (value: string, set: (v: string) => void, label: string, ph: string) => (
    <View style={{ gap: 6 }}>
      <Txt size={13.5} w={500}>{label}</Txt>
      <TextInput value={value} onChangeText={set} multiline placeholder={ph} placeholderTextColor={p.fa} accessibilityLabel={label} style={{ minHeight: 56, borderRadius: 8, backgroundColor: p.sf, color: p.tx, fontFamily: font.regular, fontSize: 13, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' }} />
    </View>
  );

  return (
    <Page bar={<AppBar icon="x" sub="Daily review · optional" />}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 10 }}>
        <Txt size={24} w={500} ls={-0.025} lh={1.05} accessibilityRole="header">{DOW_LONG[weekdayOf(today)]},{'\n'}in one look.</Txt>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
          {sts.map(({ h, s }) => (
            <View key={h.id} style={{ flex: 1 }}>
              <Cell s={s} w={40} h={32} r={6} style={{ width: '100%' }} />
            </View>
          ))}
        </View>
        <Txt size={13}>
          <Txt size={13} w={600}>{done.length} of {act.length}</Txt> done. {open > 0 ? `${open} still open — there’s time, or let them go. Tomorrow is a fresh page.` : 'Nothing left open. A full day.'}
        </Txt>
      </View>
      <Rule />
      <View style={{ paddingVertical: 12, paddingHorizontal: 20 }}>
        <Label style={{ paddingBottom: 4 }}>Streaks moving up</Label>
        {done.map(({ h }) => {
          const sc = currentSchedule(h);
          const d = mom ? momentumOf(h, log, today) + '%' : sc.kind === 'perWeek' ? weekDoneOf(h, log, today, settings.weekStart) + '/' + sc.n + ' wk' : streakOf(h, log, today, opts).current + ' days';
          return (
            <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <Icon name={h.icon} size={14} color={p.ac} />
              <Txt size={12.5} style={{ flex: 1 }}>{h.name}</Txt>
              <Txt size={12.5} w={500} tab>{d}</Txt>
            </View>
          );
        })}
        {!done.length && <Txt size={12.5} color={p.mu}>Nothing checked in yet today — that’s fine.</Txt>}
        {skipped.length > 0 && <Txt size={12} color={p.mu} style={{ paddingTop: 6 }}>Skipped: {skipped.map((x) => x.h.name).join(', ')}</Txt>}
      </View>
      <Rule />
      <View style={{ paddingVertical: 14, paddingHorizontal: 20, gap: 14 }}>
        {field(a, setA, 'What helped you stay consistent today?', 'A few words is plenty')}
        {field(b, setB, 'What got in the way?', 'No judgement — just noticing')}
        <Btn
          variant="primary"
          label="Save review"
          icon="check"
          height={46}
          size={13.5}
          onPress={() => {
            saveReview(today, a.trim(), b.trim());
            router.back();
            useUI.getState().toast('Review saved to today');
          }}
        />
      </View>
    </Page>
  );
}
