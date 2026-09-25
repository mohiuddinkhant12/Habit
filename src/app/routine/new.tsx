import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Segments } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { AppBar, Page, Rule, Seg, Txt } from '@/components/ui';
import { createRoutine } from '@/store/actions';
import { useHabitSets } from '@/store/hooks';
import { useT } from '@/theme';
import { font } from '@/theme/tokens';

const TIMES = { Morning: '07:00', Afternoon: '13:00', Evening: '21:00' } as const;
type When = keyof typeof TIMES;

export default function NewRoutine() {
  const { p } = useT();
  const router = useRouter();
  const { all } = useHabitSets();
  const [name, setName] = useState('');
  const [when, setWhen] = useState<When>('Morning');
  const [steps, setSteps] = useState<string[]>([]);
  const est = (id: string) => all.find((h) => h.id === id)?.est ?? 5;
  const mins = steps.reduce((a, id) => a + est(id), 0);
  const can = !!name.trim() && steps.length > 0;
  const save = () => {
    const id = createRoutine(name, TIMES[when], steps);
    if (id) router.replace(`/routine/${id}`);
  };
  return (
    <Page
      bar={
        <AppBar
          icon="x"
          title="New routine"
          right={
            <Pressable accessibilityRole="button" disabled={!can} onPress={save} style={{ height: 48, paddingHorizontal: 16, justifyContent: 'center' }}>
              <Txt size={13.5} w={500} color={can ? p.acx : p.fa}>Save</Txt>
            </Pressable>
          }
        />
      }
    >
      <View style={{ padding: 16, paddingHorizontal: 20, gap: 12 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Name it — e.g. Sunday reset" placeholderTextColor={p.fa} accessibilityLabel="Routine name" style={{ color: p.tx, fontFamily: font.medium, fontSize: 24, paddingVertical: 6 }} />
        <Seg options={['Morning', 'Afternoon', 'Evening'] as const} value={when} onChange={setWhen} height={40} />
        <View style={{ height: 16, borderRadius: 5, backgroundColor: p.sf, overflow: 'hidden' }}>
          <Segments height={16} radius={8} parts={steps.map((id, k) => ({ w: est(id) / Math.max(1, mins), color: k % 2 ? p.bar : p.ac }))} />
        </View>
        <Txt size={12} color={p.mu}>{steps.length} steps · about {mins} min · tap habits in the order you’ll do them</Txt>
      </View>
      <Rule />
      {all.map((h) => {
        const k = steps.indexOf(h.id);
        const sel = k >= 0;
        return (
          <Pressable key={h.id} accessibilityRole="checkbox" accessibilityState={{ checked: sel }} accessibilityLabel={sel ? `${h.name}, step ${k + 1}` : h.name} onPress={() => setSteps(sel ? steps.filter((x) => x !== h.id) : [...steps, h.id])} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: pressed ? p.sf : 'transparent' })}>
            <View style={{ width: 28, height: 28, borderWidth: 1.5, borderColor: sel ? p.ac : p.mu, borderRadius: 6, backgroundColor: sel ? p.act : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={12} w={500} color={p.acx}>{sel ? k + 1 : ''}</Txt>
            </View>
            <Icon name={h.icon} size={16.5} color={p.tx} />
            <Txt size={13.5} w={500} style={{ flex: 1 }}>{h.name}</Txt>
            <Txt size={11.5} color={p.mu}>{h.est} min</Txt>
          </Pressable>
        );
      })}
    </Page>
  );
}
