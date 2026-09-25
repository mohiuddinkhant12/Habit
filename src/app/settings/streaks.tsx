import { View } from 'react-native';

import { Cell } from '@/components/charts';
import { AppBar, Label, Page, Rule, Seg, SwitchRow, Txt } from '@/components/ui';
import { setSettings } from '@/store/actions';
import { useData } from '@/store/data';
import { useT } from '@/theme';

export default function Streaks() {
  const { p } = useT();
  const s = useData((x) => x.settings);
  const demo = Array.from({ length: 7 }, (_, k) => (k === 3 ? (s.graceN > 0 ? 'g' : 'm') : 'd') as 'g' | 'm' | 'd');
  return (
    <Page bar={<AppBar title="Streaks & rewards" />}>
      <View style={{ padding: 16, paddingHorizontal: 20, gap: 10 }}>
        <Label>Recovery model</Label>
        <Seg options={['Grace days', 'Momentum'] as const} value={s.recovery} onChange={(recovery) => setSettings({ recovery })} />
        <Txt size={11.5} lh={1.5} color={p.mu}>
          {s.recovery === 'Grace days' ? 'Classic streaks, softened: a missed day can be covered so one bad day doesn’t erase a run.' : 'No streaks to break. Each habit shows a 30-day momentum score instead — one missed day barely moves it.'}
        </Txt>
      </View>
      {s.recovery === 'Grace days' && (
        <>
          <Rule />
          <View style={{ padding: 16, paddingHorizontal: 20, gap: 10 }}>
            <Label>Grace days per week</Label>
            <Seg options={['0', '1', '2'] as const} value={String(s.graceN) as '0' | '1' | '2'} onChange={(v) => setSettings({ graceN: Number(v) as 0 | 1 | 2 })} size={13.5} />
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {demo.map((c, i) => (
                <View key={i} style={{ flex: 1 }}>
                  <Cell s={c} w={40} h={26} r={6} style={{ width: '100%' }} />
                </View>
              ))}
            </View>
            <Txt size={12} lh={1.45}>{s.graceN > 0 ? 'A missed day is covered — the streak continues.' : 'Strict: a missed day resets the streak.'} Life happens — your streak can too.</Txt>
          </View>
        </>
      )}
      <Rule />
      <View style={{ padding: 16, paddingHorizontal: 20, gap: 8 }}>
        <Label>Week starts on</Label>
        <Seg options={['Monday', 'Sunday'] as const} value={s.weekStart} onChange={(weekStart) => setSettings({ weekStart })} />
      </View>
      <Rule />
      <SwitchRow title="XP & levels" sub="10 XP per check-in. Never lost for a miss." on={s.xpOn} onToggle={() => setSettings({ xpOn: !s.xpOn })} style={{ paddingVertical: 12, paddingHorizontal: 20 }} />
      <SwitchRow title="Achievements & milestones" sub="Celebrate 7, 30, 50 and 100 days" on={s.achievementsOn} onToggle={() => setSettings({ achievementsOn: !s.achievementsOn })} style={{ paddingVertical: 12, paddingHorizontal: 20 }} />
    </Page>
  );
}
