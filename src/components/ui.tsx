import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Pressable, ScrollView, Text, View, type LayoutChangeEvent, type PressableProps, type ScrollViewProps, type StyleProp,
  type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alpha } from '@/theme/color';
import { useT } from '@/theme';
import { font } from '@/theme/tokens';
import { Icon } from './Icon';

type W = 300 | 400 | 500 | 600;
const FAM: Record<W, string> = { 300: font.light, 400: font.regular, 500: font.medium, 600: font.semibold };

export interface TxtProps extends TextProps {
  size?: number;
  w?: W;
  color?: string;
  /** Letter spacing in em, as in the design. */
  ls?: number;
  lh?: number; // line-height multiplier
  tab?: boolean; // tabular numerals
  upper?: boolean;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}

export function Txt({ size = 13, w = 400, color, ls = 0, lh = 1.4, tab, upper, align, style, ...rest }: TxtProps) {
  const { p } = useT();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: FAM[w],
          fontSize: size,
          color: color ?? p.tx,
          letterSpacing: ls * size,
          lineHeight: Math.round(size * lh),
          fontVariant: tab ? ['tabular-nums'] : undefined,
          textTransform: upper ? 'uppercase' : undefined,
          textAlign: align,
        },
        style,
      ]}
    />
  );
}

/** Small uppercase section label. */
export function Label({ children, style, color }: { children: ReactNode; style?: StyleProp<TextStyle>; color?: string }) {
  const { p } = useT();
  return (
    <Txt size={10} w={500} ls={0.14} upper color={color ?? p.lbl} style={style}>
      {children}
    </Txt>
  );
}

/** Nocturne's signature hairline: fades out over 48px at both ends. */
export function Rule({ style, color, opacity = 0.2 }: { style?: StyleProp<ViewStyle>; color?: string; opacity?: number }) {
  const { p } = useT();
  const [w, setW] = useState(360);
  const base = color ?? p.tx;
  const c = alpha(base, opacity);
  const e = Math.min(0.45, 48 / Math.max(1, w));
  return (
    <View style={[{ height: 1 }, style]} onLayout={(ev: LayoutChangeEvent) => setW(ev.nativeEvent.layout.width)} pointerEvents="none">
      <LinearGradient colors={[alpha(base, 0), c, c, alpha(base, 0)]} locations={[0, e, 1 - e, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
    </View>
  );
}

/** A section divided from the one above by the fading rule. */
export function Section({ children, style, rule = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; rule?: boolean }) {
  return (
    <View>
      {rule && <Rule />}
      <View style={style}>{children}</View>
    </View>
  );
}

/** Soft card: the design's `--card` top-to-bottom shade. */
export function Card({ children, style, radius = 12, active }: { children?: ReactNode; style?: StyleProp<ViewStyle>; radius?: number; active?: boolean }) {
  const { p } = useT();
  const colors: [string, string] = active ? [p.act, p.act] : [p.cardTop, p.cardBottom];
  return (
    <LinearGradient colors={colors} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      {children}
    </LinearGradient>
  );
}

/** Horizontal accent gradient fill with a glow — every progress bar in the app. */
export function GlowFill({ style, glow = true }: { style?: StyleProp<ViewStyle>; glow?: boolean }) {
  const { p } = useT();
  return (
    <View style={[{ borderRadius: 99, boxShadow: glow ? p.glow : undefined }, style]}>
      <LinearGradient colors={[p.acDeep, p.ac]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 99 }} />
    </View>
  );
}

/** Track + glowing fill. `v` is 0..1. */
export function Bar({ v, height = 4, track, style }: { v: number; height?: number; track?: string; style?: StyleProp<ViewStyle> }) {
  const { p } = useT();
  const pct = Math.max(0, Math.min(1, v)) * 100;
  return (
    <View style={[{ height, borderRadius: 99, backgroundColor: track ?? p.sf2 }, style]}>
      {pct > 0 && <GlowFill style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%` }} />}
    </View>
  );
}

interface BtnProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'plain';
  height?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

/** The design's action button: label left, icon right. Primary is an accent outline with a faint tint. */
export function Btn({ label, icon, variant = 'secondary', height = 44, size = 13, style, color, disabled, ...rest }: BtnProps) {
  const { p } = useT();
  const primary = variant === 'primary';
  const fg = color ?? (primary ? p.acx : p.tx);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        {
          height,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          borderRadius: 8,
          borderWidth: variant === 'plain' ? 0 : 1,
          borderColor: primary ? p.ac : p.ln2,
          backgroundColor: primary ? alpha(p.ac, pressed ? 0.2 : 0.1) : pressed ? p.sf : 'transparent',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Txt size={size} w={500} color={fg}>
        {label}
      </Txt>
      {icon && <Icon name={icon} size={size + 3.5} color={fg} />}
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, label, size = 19, color, style }: { icon: string; onPress?: () => void; label: string; size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const { p } = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? p.sf : 'transparent' }, style]}
    >
      <Icon name={icon} size={size} color={color ?? p.tx} />
    </Pressable>
  );
}

export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  const { p } = useT();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={onToggle}
      hitSlop={10}
      style={{ width: 44, height: 26, borderRadius: 14, borderWidth: 1.5, borderColor: on ? p.ac : p.tx, backgroundColor: on ? p.ac : 'transparent', justifyContent: 'center' }}
    >
      <View style={{ position: 'absolute', left: on ? 20.5 : 2.5, width: 16, height: 16, borderRadius: 8, backgroundColor: on ? p.onac : p.tx }} />
    </Pressable>
  );
}

/** A labelled switch row. */
export function SwitchRow({ title, sub, on, onToggle, style }: { title: string; sub?: string; on: boolean; onToggle: () => void; style?: StyleProp<ViewStyle> }) {
  const { p } = useT();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={13.5} w={500}>{title}</Txt>
        {sub ? <Txt size={11.5} color={p.mu}>{sub}</Txt> : null}
      </View>
      <Switch on={on} onToggle={onToggle} label={title} />
    </View>
  );
}

/** Outlined segmented control — selected option takes the accent tint. */
export function Seg<T extends string>({ options, value, onChange, height = 44, size = 12, labels }: { options: readonly T[]; value: T; onChange: (v: T) => void; height?: number; size?: number; labels?: Partial<Record<T, string>> }) {
  const { p } = useT();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', borderWidth: 1, borderColor: p.ln2, borderRadius: 8, overflow: 'hidden' }}>
      {options.map((o) => {
        const sel = o === value;
        return (
          <Pressable
            key={o}
            accessibilityRole="radio"
            accessibilityState={{ selected: sel }}
            onPress={() => onChange(o)}
            style={{ flex: 1, height, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: sel ? p.act : 'transparent' }}
          >
            <Txt size={size} w={500} color={sel ? p.acx : p.mu} numberOfLines={1}>
              {labels?.[o] ?? o}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, sel, onPress, icon, height = 34 }: { label: string; sel?: boolean; onPress: () => void; icon?: string; height?: number }) {
  const { p } = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!sel }}
      onPress={onPress}
      style={({ pressed }) => ({ height, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: p.ln2, borderRadius: 14, backgroundColor: sel ? p.act : pressed ? p.sf : 'transparent' })}
    >
      {icon && <Icon name={icon} size={14} color={sel ? p.acx : p.tx} />}
      <Txt size={11.5} w={500} color={sel ? p.acx : p.tx} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** The 56dp top bar with back, optional title and trailing actions. */
export function AppBar({ title, right, icon = 'arrow-left', onBack, sub }: { title?: string; right?: ReactNode; icon?: 'arrow-left' | 'x'; onBack?: () => void; sub?: string }) {
  const { p } = useT();
  const router = useRouter();
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, backgroundColor: p.bg }}>
      <IconBtn icon={icon} label={icon === 'x' ? 'Close' : 'Back'} size={icon === 'x' ? 22 : 20} onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      <View style={{ flex: 1 }}>
        {title ? <Txt size={16.5} w={500} numberOfLines={1}>{title}</Txt> : null}
        {sub ? <Txt size={12} color={p.mu} numberOfLines={1}>{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}

/** Full-screen page: safe-area top, app background, optional scroll body. */
export function Page({ children, scroll = true, bar, contentStyle, footer, ...rest }: { children: ReactNode; scroll?: boolean; bar?: ReactNode; contentStyle?: StyleProp<ViewStyle>; footer?: ReactNode } & ScrollViewProps) {
  const { p } = useT();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: ins.top }}>
      {bar}
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[{ paddingBottom: 24 + ins.bottom }, contentStyle]} {...rest}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingBottom: ins.bottom }, contentStyle]}>{children}</View>
      )}
      {footer}
    </View>
  );
}

/** A tappable list row: leading icon, title and subtitle, trailing caret. */
export function Row({ icon, title, sub, onPress, trailing, caret = true }: { icon?: string; title: string; sub?: string; onPress?: () => void; trailing?: ReactNode; caret?: boolean }) {
  const { p } = useT();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingLeft: 20, paddingRight: 16, backgroundColor: pressed ? p.sf : 'transparent' })}
    >
      {icon && <Icon name={icon} size={20} color={p.tx} style={{ width: 22 }} />}
      <View style={{ flex: 1, gap: 1 }}>
        <Txt size={13.5} w={500}>{title}</Txt>
        {sub ? <Txt size={11.5} color={p.mu}>{sub}</Txt> : null}
      </View>
      {trailing}
      {caret && onPress && <Icon name="caret-right" size={15} color={p.mu} />}
    </Pressable>
  );
}

/** Legend swatch + label. */
export function Legend({ items }: { items: { label: string; swatch: ReactNode }[] }) {
  const { p } = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {it.swatch}
          <Txt size={11} color={p.mu}>{it.label}</Txt>
        </View>
      ))}
    </View>
  );
}

export function Swatch({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: 3, backgroundColor: color }} />;
}

/** Plain info note on the surface colour. */
export function Note({ icon, children }: { icon: string; children: ReactNode }) {
  const { p } = useT();
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 8, backgroundColor: p.sf }}>
      <Icon name={icon} size={16.5} color={p.tx} style={{ marginTop: 1 }} />
      <Txt size={12} lh={1.5} style={{ flex: 1 }}>{children}</Txt>
    </View>
  );
}

/** A −/value/+ stepper used by the habit form. */
export function Stepper({ value, onMinus, onPlus, minWidth = 64, height = 48, size = 16.5 }: { value: string; onMinus: () => void; onPlus: () => void; minWidth?: number; height?: number; size?: number }) {
  const { p } = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: p.ln2, borderRadius: 8, overflow: 'hidden', height }}>
      <IconBtn icon="minus" label="Less" size={14.5} onPress={onMinus} style={{ borderRadius: 0 }} />
      <Txt size={size} w={500} tab align="center" style={{ minWidth }}>{value}</Txt>
      <IconBtn icon="plus" label="More" size={14.5} onPress={onPlus} style={{ borderRadius: 0 }} />
    </View>
  );
}

export { alpha };
