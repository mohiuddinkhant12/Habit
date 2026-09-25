import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

import { Cell, Hatch } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { AppBar, Btn, Card, Label, Page, Rule, Txt } from '@/components/ui';
import { completeStep, recordRun } from '@/store/actions';
import { useData } from '@/store/data';
import { useT } from '@/theme';
import { useAnim } from '@/components/anim';

export default function RunRoutine() {
  const { p, t2 } = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useData((s) => s.routines.find((x) => x.id === id));
  const habits = useData((s) => s.habits);
  const xpOn = useData((s) => s.settings.xpOn);
  const [i, setI] = useState(0);
  const [res, setRes] = useState<('d' | 's')[]>([]);
  const slide = useAnim(1);
  useEffect(() => {
    if (!t2) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: t2, useNativeDriver: true }).start();
  }, [i, slide, t2]);

  if (!r) return <Page bar={<AppBar icon="x" />}><Txt style={{ padding: 20 }}>This routine is gone.</Txt></Page>;
  const hs = r.steps.map((sid) => habits.find((h) => h.id === sid && !h.archived)).filter((h): h is NonNullable<typeof h> => !!h);
  const fin = i >= hs.length;
  const h = hs[i];
  const close = () => (router.canGoBack() ? router.back() : router.replace('/routines'));

  const step = (ok: boolean) => {
    if (ok && h) completeStep(h.id);
    const next = [...res, ok ? 'd' : 's'] as ('d' | 's')[];
    setRes(next);
    setI(i + 1);
    if (i + 1 >= hs.length) recordRun(r.id, next);
  };

  const hint = !h ? '' : h.type === 'qty' ? `One ${h.unit.replace(/s$/, '')} toward today’s ${h.target.toLocaleString('en-US')}` : h.type === 'dur' ? `${h.target} minutes. Take your time.` : h.type === 'avoid' ? 'Set yourself up for it — then carry on.' : `About ${h.est} minute${h.est === 1 ? '' : 's'}.`;
  const doneN = res.filter((x) => x === 'd').length;

  return (
    <Page
      scroll={false}
      bar={
        <AppBar
          icon="x"
          onBack={close}
          title={`${r.name} routine`}
          right={<Txt size={12} color={p.mu} style={{ paddingRight: 16 }}>Step {Math.min(i + 1, hs.length)} of {hs.length}</Txt>}
        />
      }
    >
      <View style={{ flexDirection: 'row', gap: 3, paddingHorizontal: 20 }}>
        {hs.map((x, k) => (
          <View key={x.id} style={{ flex: 1, height: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: k < i ? (res[k] === 'd' ? p.ac : 'transparent') : k === i ? p.tx : p.sf2 }}>
            {k < i && res[k] === 's' && <Hatch color={p.fa} />}
          </View>
        ))}
      </View>
      {!fin && h ? (
        <View style={{ flex: 1, paddingTop: 28, paddingHorizontal: 24, paddingBottom: 24, gap: 16 }}>
          <Animated.View style={{ gap: 12, opacity: slide, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
            <Icon name={h.icon} size={40} color={p.ac} />
            <Txt size={39} w={300} ls={-0.05} lh={1} accessibilityRole="header">{h.name}</Txt>
            <Txt size={13.5} lh={1.45} color={p.mu}>{hint}</Txt>
          </Animated.View>
          <View style={{ flex: 1 }} />
          {i + 1 < hs.length && (
            <View>
              <Rule />
              <Label style={{ paddingTop: 10, paddingBottom: 4 }}>Up next</Label>
              {hs.slice(i + 1).map((x, k) => (
                <View key={x.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8 }}>
                  <Txt size={13} w={500} tab style={{ width: 16 }}>{i + 2 + k}</Txt>
                  <Txt size={13} style={{ flex: 1 }}>{x.name}</Txt>
                  <Txt size={13} color={p.mu}>{x.est} min</Txt>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Skip" icon="skip-forward" size={13.5} style={{ flex: 1, paddingHorizontal: 14 }} onPress={() => step(false)} />
            <Btn variant="primary" label="Done" icon="check" size={14.5} style={{ flex: 2 }} onPress={() => step(true)} />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingTop: 28, paddingHorizontal: 24, paddingBottom: 24, gap: 14 }}>
          <View style={{ flex: 1 }} />
          <Txt size={42} w={300} ls={-0.05} lh={1} accessibilityRole="header">{r.name}{'\n'}routine done.</Txt>
          <View style={{ flexDirection: 'row', gap: 1, backgroundColor: p.ln, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden' }}>
            {[
              [`${doneN}/${hs.length}`, 'steps done', p.tx],
              [String(hs.reduce((a, x) => a + x.est, 0)), 'minutes', p.tx],
              ...(xpOn ? [[`+${doneN * 10} XP`, 'earned', p.acx]] : []),
            ].map(([v, l, c]) => (
              <Card key={l} radius={10} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 2 }}>
                <Txt size={24} w={500} color={c}>{v}</Txt>
                <Txt size={11} color={p.mu}>{l}</Txt>
              </Card>
            ))}
          </View>
          <View>
            {hs.map((x, k) => (
              <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                <Cell s={res[k] ?? 'n'} size={14} />
                <Txt size={13} style={{ flex: 1 }}>{x.name}</Txt>
                <Txt size={12} color={p.mu}>{res[k] === 'd' ? 'Done' : 'Skipped'}</Txt>
              </View>
            ))}
          </View>
          <Btn variant="primary" label="Finish" icon="arrow-right" height={46} size={13.5} onPress={close} />
        </View>
      )}
    </Page>
  );
}
