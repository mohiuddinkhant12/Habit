import { Pressable, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { AppBar, Label, Page, Rule, Seg, SwitchRow, Txt } from '@/components/ui';
import type { Settings } from '@/domain/types';
import { setSettings } from '@/store/actions';
import { useData } from '@/store/data';
import { useT } from '@/theme';
import { nocturne } from '@/theme/tokens';

const ACCENTS: [Settings['accent'], string][] = [
  ['Blurple', nocturne.accent],
  ['Lilac', nocturne.accent2],
  ['Slate', nocturne.neutral[400]],
];

export default function Appearance() {
  const { p } = useT();
  const s = useData((x) => x.settings);
  const block = (label: string, node: React.ReactNode) => (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      {node}
    </View>
  );
  return (
    <Page bar={<AppBar title="Appearance" />}>
      <View style={{ padding: 16, paddingHorizontal: 20, gap: 18 }}>
        {block('Theme', <Seg options={['Light', 'Dark', 'System'] as const} value={s.theme} onChange={(theme) => setSettings({ theme })} />)}
        {block(
          'Accent',
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            {ACCENTS.map(([a, sw]) => (
              <Pressable key={a} accessibilityRole="radio" accessibilityState={{ selected: s.accent === a }} onPress={() => setSettings({ accent: a })} style={{ flex: 1, height: 64, borderWidth: 2, borderColor: s.accent === a ? p.tx : 'transparent', borderRadius: 8, backgroundColor: sw, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', padding: 8 }}>
                <Txt size={12} w={500} color={nocturne.bg}>{a}</Txt>
                {s.accent === a && <Icon name="check" size={14} color={nocturne.bg} />}
              </Pressable>
            ))}
          </View>,
        )}
        {block('Density', <Seg options={['Comfortable', 'Compact'] as const} value={s.density} onChange={(density) => setSettings({ density })} />)}
        {block('Group Today by', <Seg options={['Time of day', 'Category', 'None'] as const} value={s.groupBy} onChange={(groupBy) => setSettings({ groupBy })} />)}
        {block('Today layout', <Seg options={['List', 'Grid'] as const} value={s.todayLayout} onChange={(todayLayout) => setSettings({ todayLayout })} />)}
        {block(
          'Completion feel',
          <>
            <Seg options={['Controls', 'Fill row'] as const} value={s.rowControl} onChange={(rowControl) => setSettings({ rowControl })} labels={{ Controls: 'Separate controls', 'Fill row': 'Tap the row' }} />
            <Txt size={11.5} lh={1.5} color={p.mu}>{s.rowControl === 'Controls' ? 'Each row has its own check, stepper or timer button. Tap the row for details.' : 'Tap anywhere on a row to log it — the row fills as you go. The arrow opens details.'}</Txt>
          </>,
        )}
        <View style={{ gap: 14 }}>
          <Rule />
          <SwitchRow title="Reduce motion" sub="Instant changes, no animation" on={s.reduceMotion} onToggle={() => setSettings({ reduceMotion: !s.reduceMotion })} />
        </View>
        <Txt size={11.5} lh={1.5} color={p.mu}>Status never relies on colour alone: done is filled, partial is half-filled, skipped is dashed, missed is struck through.</Txt>
      </View>
    </Page>
  );
}
