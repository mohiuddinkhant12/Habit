import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { increment, slip, startTimer, toggle } from '@/store/actions';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';
import { alpha } from '@/theme/color';
import { useAnim } from './anim';
import type { HabitVM } from './habitVM';
import { Icon } from './Icon';
import { Txt } from './ui';

/** Springy pop used when a check appears. */
function Pop({ children, on }: { children: ReactNode; on: boolean }) {
  const { t2 } = useT();
  const s = useAnim(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (on && t2) {
      s.setValue(0.3);
      Animated.timing(s, { toValue: 1, duration: t2 + 120, easing: Easing.out(Easing.back(3)), useNativeDriver: true }).start();
    }
  }, [on, s, t2]);
  return <Animated.View style={{ transform: [{ scale: s }] }}>{children}</Animated.View>;
}

/**
 * The completion box: an outlined diamond that springs upright into a
 * glowing, gradient-filled rounded square when ticked. Skipped is dashed.
 */
export function CheckBox({ done, skipped, size = 26 }: { done: boolean; skipped?: boolean; size?: number }) {
  const { p, t2 } = useT();
  const a = useAnim(done || skipped ? 1 : 0);
  useEffect(() => {
    const to = done || skipped ? 1 : 0;
    if (!t2) a.setValue(to);
    else Animated.spring(a, { toValue: to, useNativeDriver: true, friction: 5, tension: 160 }).start();
  }, [done, skipped, a, t2]);
  const rotate = a.interpolate({ inputRange: [0, 1], outputRange: ['45deg', '0deg'] });
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.82, done ? 1.08 : 1] });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        borderWidth: 1.5,
        borderStyle: skipped ? 'dashed' : 'solid',
        borderColor: done ? p.ac : skipped ? p.fa : p.mu,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: done ? p.glow : undefined,
        transform: [{ rotate }, { scale }],
      }}
    >
      {done && <LinearGradient colors={[p.acx, p.ac, p.acMid]} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />}
      {done && (
        <Pop on={done}>
          <Icon name="check" weight="bold" size={15} color={p.bg} />
        </Pop>
      )}
      {skipped && <Icon name="minus" weight="bold" size={13} color={p.fa} />}
    </Animated.View>
  );
}

/** One pill per unit for small counts, like 8 glasses. */
function Beads({ n, v }: { n: number; v: number }) {
  const { p } = useT();
  return (
    <View style={{ flexDirection: 'row', gap: 3, marginTop: 5 }}>
      {Array.from({ length: n }, (_, k) => (
        <View key={k} style={{ flex: 1, maxWidth: 16, height: 5, borderRadius: 99, backgroundColor: k < v ? p.ac : p.sf2, boxShadow: k < v ? p.glow : undefined }} />
      ))}
    </View>
  );
}

/** Quartered track with a glowing fill and a bright leading dot, for large targets. */
function Track({ frac }: { frac: number }) {
  const { p } = useT();
  const pct = Math.max(0, Math.min(1, frac)) * 100;
  return (
    <View style={{ height: 5, marginTop: 6, marginRight: 6, flexDirection: 'row', gap: 3 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ flex: 1, borderRadius: 99, backgroundColor: p.sf2 }} />
      ))}
      {pct > 0 && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 99, boxShadow: p.glow }}>
          <LinearGradient colors={[p.acDeep, p.ac]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 99 }} />
          <View style={{ position: 'absolute', right: -4, top: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: p.acx, boxShadow: `0px 0px 0px 2px ${p.bg}, ${p.glow}` }} />
        </View>
      )}
    </View>
  );
}

function ctlLabel(vm: HabitVM) {
  const h = vm.h;
  if (h.type === 'dur') return vm.done ? 'Undo ' + h.name : 'Start ' + h.target + ' minute timer';
  return vm.done ? 'Undo ' + h.name : 'Mark ' + h.name + ' done';
}

/** The trailing control on a Today row, by habit type. */
function Control({ vm }: { vm: HabitVM }) {
  const { p } = useT();
  const router = useRouter();
  const h = vm.h;
  if (h.type === 'bool' || (h.type === 'dur' && vm.done)) {
    return (
      <Pressable accessibilityRole="checkbox" accessibilityLabel={ctlLabel(vm)} accessibilityState={{ checked: vm.done }} onPress={() => toggle(h.id)} hitSlop={4} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <CheckBox done={vm.done} skipped={vm.skipped} />
      </Pressable>
    );
  }
  if (h.type === 'qty') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1.5, borderColor: vm.done ? p.ac : p.tx, borderRadius: 8, overflow: 'hidden' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={'Decrease ' + h.name} onPress={() => increment(h.id, -1)} style={({ pressed }) => ({ width: 36, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? p.sf2 : 'transparent' })}>
          <Icon name="minus" size={14.5} color={p.tx} />
        </Pressable>
        <Txt size={12} w={500} tab align="center" style={{ minWidth: 50 }}>{vm.qtyText}</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={'Increase ' + h.name} onPress={() => increment(h.id, 1)} style={({ pressed }) => ({ width: 36, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: vm.done ? p.act : pressed ? p.sf2 : 'transparent' })}>
          <Icon name="plus" size={14.5} color={vm.done ? p.acx : p.tx} />
        </Pressable>
      </View>
    );
  }
  if (h.type === 'dur') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ctlLabel(vm)}
        onPress={() => {
          startTimer(h.id);
          router.push('/timer');
        }}
        style={({ pressed }) => ({ height: 44, paddingLeft: 12, paddingRight: 14, borderWidth: 1, borderColor: p.ln2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pressed ? p.sf2 : 'transparent' })}
      >
        <Icon name="play" size={13.5} color={p.tx} />
        <Txt size={12} w={500}>{vm.value > 0 ? 'Resume' : 'Start'}</Txt>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={vm.slipped ? 'Undo slip for ' + h.name : 'Log a slip for ' + h.name}
      onPress={() => slip(h.id)}
      style={({ pressed }) => ({ height: 44, paddingHorizontal: 12, borderWidth: 1.5, borderColor: vm.slipped ? p.mu : p.tx, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: pressed ? p.sf2 : 'transparent' })}
    >
      <Icon name={vm.slipped ? 'arrow-counter-clockwise' : 'flag'} size={13.5} color={vm.slipped ? p.mu : p.tx} />
      <Txt size={12} w={500} color={vm.slipped ? p.mu : p.tx} numberOfLines={1}>{vm.slipped ? 'Undo' : 'Log slip'}</Txt>
    </Pressable>
  );
}

/** The single "most likely" action for a habit — tiles, fill rows and widgets use it. */
export function usePrimary() {
  const router = useRouter();
  return (vm: HabitVM) => {
    const h = vm.h;
    if (h.type === 'bool') toggle(h.id);
    else if (h.type === 'qty') increment(h.id, 1);
    else if (h.type === 'dur') {
      if (vm.done) toggle(h.id);
      else {
        startTimer(h.id);
        router.push('/timer');
      }
    } else router.push(`/habit/${h.id}`);
  };
}

export function HabitRow({ vm, fill }: { vm: HabitVM; fill: boolean }) {
  const { p, rp, t2 } = useT();
  const router = useRouter();
  const primary = usePrimary();
  const h = vm.h;
  const open = () => router.push(`/habit/${h.id}`);
  const width = useAnim(vm.frac);
  useEffect(() => {
    Animated.timing(width, { toValue: vm.frac, duration: t2, useNativeDriver: false }).start();
  }, [vm.frac, width, t2]);
  const showBar = !fill && (h.type === 'qty' || (h.type === 'dur' && vm.value > 0 && !vm.done));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={vm.aria}
      accessibilityHint={fill ? 'Logs it. Hold for more actions.' : 'Opens details. Hold for more actions.'}
      onPress={fill ? () => primary(vm) : open}
      onLongPress={() => useUI.getState().openSheet({ k: 'actions', id: h.id })}
      delayLongPress={480}
      style={({ pressed }) => ({ borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingVertical: rp, paddingLeft: 20, paddingRight: 12, overflow: 'hidden', backgroundColor: pressed ? alpha(p.sf, 0.55) : 'transparent' })}
    >
      {fill && (
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: p.act, width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      )}
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: vm.done ? p.act : p.sf, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={h.icon} size={19} color={vm.done ? p.acx : p.mu} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Txt size={14} w={500} color={vm.done || vm.skipped ? p.mu : p.tx} numberOfLines={1}>{h.name}</Txt>
        <Txt size={12} color={p.mu} numberOfLines={1}>{vm.meta}</Txt>
        {showBar && (h.type === 'qty' && h.target <= 12 ? <Beads n={h.target} v={vm.value} /> : <Track frac={vm.frac} />)}
      </View>
      {fill ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Txt size={12} w={500} tab color={vm.done ? p.mu : p.tx}>{vm.valText}</Txt>
          {vm.done && (
            <Pop on={vm.done}>
              <Icon name="check" size={16.5} color={p.ac} style={{ marginLeft: 4 }} />
            </Pop>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel={'Details for ' + h.name} onPress={open} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="caret-right" size={16.5} color={p.mu} />
          </Pressable>
        </View>
      ) : (
        <Control vm={vm} />
      )}
    </Pressable>
  );
}

export function HabitTile({ vm }: { vm: HabitVM }) {
  const { p } = useT();
  const router = useRouter();
  const primary = usePrimary();
  const h = vm.h;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={vm.aria}
      accessibilityHint="Logs it. Hold for more actions."
      onPress={() => primary(vm)}
      onLongPress={() => useUI.getState().openSheet({ k: 'actions', id: h.id })}
      delayLongPress={480}
      style={{ flexBasis: '48%', flexGrow: 1, minHeight: 136, borderRadius: 12, overflow: 'hidden', boxShadow: vm.done ? `inset 0px 0px 0px 1px ${alpha(p.ac, 0.45)}` : undefined }}
    >
      <LinearGradient colors={vm.done ? [p.act, p.cardBottom] : [p.cardTop, p.cardBottom]} style={{ flex: 1, paddingTop: 12, paddingRight: 12, paddingBottom: 14, paddingLeft: 14, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: vm.done ? p.act : p.sf, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={h.icon} size={18} color={vm.done ? p.acx : p.mu} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={'Details for ' + h.name} onPress={() => router.push(`/habit/${h.id}`)} style={{ width: 36, height: 36, marginTop: -8, marginRight: -6, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow-up-right" size={14.5} color={p.mu} />
          </Pressable>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={24} w={500} ls={-0.025} tab color={vm.done ? p.acx : p.tx}>{vm.valText}</Txt>
          {vm.done && (
            <Pop on={vm.done}>
              <Icon name="check" size={20} color={p.acx} />
            </Pop>
          )}
        </View>
        <Txt size={13} w={500} color={vm.done || vm.skipped ? p.mu : p.tx}>{h.name}</Txt>
        <Txt size={11} lh={1.35} color={p.mu}>{vm.meta}</Txt>
      </LinearGradient>
      <View style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${vm.frac * 100}%`, borderRadius: 99, boxShadow: p.glow, overflow: 'hidden' }}>
        <LinearGradient colors={[p.acDeep, p.ac]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </View>
    </Pressable>
  );
}

/** The floating + button — solid surface so the list never shows through; steps aside for the undo bar. */
export function Fab({ onPress }: { onPress: () => void }) {
  const { p, t } = useT();
  const snack = useUI((s) => s.snack);
  const y = useAnim(0);
  useEffect(() => {
    Animated.timing(y, { toValue: snack ? -60 : 0, duration: t, useNativeDriver: true }).start();
  }, [snack, y, t]);
  return (
    <Animated.View style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 4, transform: [{ translateY: y }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New habit"
        onPress={onPress}
        style={{ width: 56, height: 56, borderRadius: 14, borderWidth: 1, borderColor: p.ac, backgroundColor: p.sf, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: `${p.shadowMd}, ${p.glow}` }}
      >
        {({ pressed }) => (
          <>
            <View style={{ position: 'absolute', inset: 0, backgroundColor: alpha(p.ac, pressed ? 0.28 : 0.18) }} />
            <View>
              <Icon name="plus" size={24} color={p.acx} />
            </View>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
