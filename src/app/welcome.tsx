import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Glow } from '@/components/overlays';
import { Note, Rule, Txt } from '@/components/ui';
import { AREAS, STARTERS, TYPE_LABEL } from '@/domain/catalog';
import { fmtNum } from '@/domain/goals';
import type { Category } from '@/domain/types';
import { ensurePermission } from '@/services/notifications';
import { finishOnboarding, loadSample } from '@/store/actions';
import { useData } from '@/store/data';
import { useT } from '@/theme';
import { alpha } from '@/theme/color';
import { useAnim } from '@/components/anim';

const REMS: [string, string][] = [
  ['One morning summary', 'A single note at 08:00 with your day'],
  ['At each habit’s time', 'Reminders you set per habit'],
  ['No reminders', 'You can turn them on later'],
];

export default function Welcome() {
  const { p, t2 } = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const params = useLocalSearchParams<{ step?: string }>();
  const onboarded = useData((s) => s.onboarded);
  const [splash, setSplash] = useState(!params.step && !onboarded);
  const [step, setStep] = useState(Number(params.step ?? 0));
  const [areas, setAreas] = useState<Category[]>(['Health', 'Mind', 'Learning']);
  const [picks, setPicks] = useState<string[]>(['water', 'meditate', 'read']);
  const [rem, setRem] = useState<0 | 1 | 2>(0);
  const fade = useAnim(1);

  useEffect(() => {
    if (!splash) return;
    const t = setTimeout(() => setSplash(false), 1500);
    return () => clearTimeout(t);
  }, [splash]);

  useEffect(() => {
    if (!t2) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: t2, useNativeDriver: true }).start();
  }, [step, fade, t2]);

  const enter = async (ids: string[]) => {
    finishOnboarding(ids, rem);
    if (rem !== 2) await ensurePermission();
    router.replace('/');
  };

  if (splash) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 72 + ins.bottom, gap: 10 }}>
        <Glow />
        <View style={{ width: 40, height: 40, borderWidth: 3, borderColor: p.tx, borderRadius: 6 }} />
        <Txt size={42} w={300} ls={-0.05} lh={0.95}>HabitFlow</Txt>
        <Txt size={13.5} w={500}>Stored on this device. Works offline.</Txt>
      </View>
    );
  }

  const suggestions = AREAS.filter((a) => areas.includes(a.area)).flatMap((a) => a.ids).map((id) => STARTERS.find((s) => s.id === id)!).filter(Boolean);
  const cta = step === 0 ? 'Get started' : step === 3 ? 'Enter HabitFlow' : step === 2 ? `Add ${picks.length} habit${picks.length === 1 ? '' : 's'}` : 'Continue';
  const next = () => (step === 3 ? enter(picks.filter((id) => suggestions.some((s) => s.id === id))) : setStep(step + 1));

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: ins.top, paddingBottom: ins.bottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingRight: 16, paddingLeft: 24, height: 48 }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityLabel={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((k) => (
            <View key={k} style={{ flex: 1, height: 4, borderRadius: 14, backgroundColor: k <= step ? p.ac : p.sf2 }} />
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => enter([])} style={{ paddingVertical: 12, paddingHorizontal: 8 }}>
          <Txt size={13} w={500} color={p.mu}>Skip</Txt>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingTop: 16, paddingHorizontal: 24, paddingBottom: 24 }}>
        <Animated.View style={{ flex: 1, gap: 16, opacity: fade, transform: [{ translateX: fade.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
          {step === 0 && (
            <View style={{ flex: 1, justifyContent: 'flex-end', gap: 16 }}>
              <Art />
              <Txt size={46} w={300} ls={-0.05} lh={0.95} accessibilityRole="header">Small things,{'\n'}done often.</Txt>
              <Txt size={14.5} lh={1.5} color={p.mu}>HabitFlow helps you build routines that survive real life. No account, no internet needed — everything stays on this phone.</Txt>
              <Pressable accessibilityRole="button" onPress={() => { loadSample(); router.replace('/'); }} style={{ paddingVertical: 6 }}>
                <Txt size={12.5} w={500} color={p.acx}>Or explore with six months of sample data →</Txt>
              </Pressable>
            </View>
          )}

          {step === 1 && (
            <>
              <Txt size={24} w={500} ls={-0.025} lh={1.05} accessibilityRole="header">What would you like to grow?</Txt>
              <Txt size={13} color={p.mu}>Pick any. This only shapes the suggestions.</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: p.ln, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden' }}>
                {AREAS.map((a) => {
                  const sel = areas.includes(a.area);
                  return (
                    <Pressable
                      key={a.area}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: sel }}
                      onPress={() => setAreas(sel ? areas.filter((x) => x !== a.area) : [...areas, a.area])}
                      style={{ flexBasis: '49%', flexGrow: 1, height: 72, borderWidth: 1, borderColor: sel ? p.ac : 'transparent', borderRadius: 10, overflow: 'hidden' }}
                    >
                      <LinearGradient colors={sel ? [p.act, p.act] : [p.cardTop, p.cardBottom]} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, justifyContent: 'space-between' }}>
                        <Icon name={a.icon} size={20} color={sel ? p.acx : p.tx} />
                        <Txt size={13.5} w={500} color={sel ? p.acx : p.tx}>{a.area}</Txt>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Txt size={24} w={500} ls={-0.025} lh={1.05} accessibilityRole="header">Start with two or three.</Txt>
              <Txt size={13} color={p.mu}>Easy wins build the habit of showing up. You can adjust targets any time.</Txt>
              <View>
                <Rule />
                {suggestions.map((s) => {
                  const sel = picks.includes(s.id);
                  return (
                    <Pressable key={s.id} accessibilityRole="checkbox" accessibilityState={{ checked: sel }} onPress={() => setPicks(sel ? picks.filter((x) => x !== s.id) : [...picks, s.id])} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
                      <Icon name={s.icon} size={20} color={p.tx} style={{ width: 24 }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt size={13.5} w={500}>{s.name}</Txt>
                        <Txt size={12} color={p.mu}>{(s.type === 'qty' ? fmtNum(s.target!) + ' ' + s.unit : s.type === 'dur' ? s.target + ' min' : TYPE_LABEL[s.type]) + ' · ' + s.time}</Txt>
                      </View>
                      <View style={{ width: 24, height: 24, borderWidth: 1.5, borderColor: sel ? p.ac : p.mu, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: sel ? p.glow : undefined }}>
                        {sel && <LinearGradient colors={[p.acx, p.ac]} locations={[0, 0.6]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />}
                        {sel && <View><Icon name="check" weight="bold" size={14.5} color={p.bg} /></View>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Txt size={24} w={500} ls={-0.025} lh={1.05} accessibilityRole="header">How should we nudge you?</Txt>
              <View>
                <Rule />
                {REMS.map(([l, d], k) => (
                  <Pressable key={l} accessibilityRole="radio" accessibilityState={{ selected: rem === k }} onPress={() => setRem(k as 0 | 1 | 2)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
                    <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: p.ln2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: rem === k ? p.ac : 'transparent' }} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt size={13.5} w={500}>{l}</Txt>
                      <Txt size={12} color={p.mu}>{d}</Txt>
                    </View>
                  </Pressable>
                ))}
              </View>
              <Note icon="moon">Quiet hours 22:00–07:00 are on. Change them any time in Reminders.</Note>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <Rule />
      <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12, paddingHorizontal: 24, paddingBottom: 20 }}>
        {step > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => setStep(step - 1)} style={{ width: 46, height: 46, borderWidth: 1, borderColor: p.ln2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-left" size={20} color={p.tx} />
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={next} style={({ pressed }) => ({ flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderWidth: 1, borderColor: p.ac, borderRadius: 8, backgroundColor: alpha(p.ac, pressed ? 0.2 : 0.1) })}>
          <Txt size={14.5} w={500} color={p.acx}>{cta}</Txt>
          <Icon name="arrow-right" size={20} color={p.acx} />
        </Pressable>
      </View>
    </View>
  );
}

/** The welcome mosaic: a month of check-ins in miniature. */
function Art() {
  const { p } = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 28 }, (_, k) => {
        const r = ((k * 37) % 11) / 11;
        const c = k > 24 ? { bg: 'transparent', bd: p.ln } : r < 0.62 ? { bg: p.ac, bd: p.ac } : r < 0.8 ? { bg: p.act, bd: p.ac } : { bg: 'transparent', bd: p.tx };
        return <View key={k} style={{ width: '13.2%', aspectRatio: 1, borderRadius: 3, backgroundColor: c.bg, borderWidth: 2, borderColor: c.bd }} />;
      })}
    </View>
  );
}
