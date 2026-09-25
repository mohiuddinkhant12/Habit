import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Polygon, Polyline, Rect } from 'react-native-svg';

import type { Status } from '@/domain/types';
import { useT } from '@/theme';
import type { Palette } from '@/theme/palette';
import { useAnim } from './anim';
import { Txt } from './ui';

export type CellKind = Status | 'g'; // g: missed, but covered by a grace day

/**
 * One status mark as SVG. Status never relies on colour alone: done is
 * filled, partial half-filled, skipped dashed, missed struck through.
 */
export function cellShapes(p: Palette, s: CellKind, x: number, y: number, w: number, h: number, r: number, sw: number, key: string | number): ReactNode {
  const i = sw / 2;
  const box = { x: x + i, y: y + i, width: Math.max(0, w - sw), height: Math.max(0, h - sw), rx: Math.max(0, r - i) };
  switch (s) {
    case 'd':
      return <Rect key={key} x={x} y={y} width={w} height={h} rx={r} fill={p.ac} />;
    case 'p':
      return [
        <Rect key={key + 'a'} x={x} y={y + h / 2} width={w} height={h / 2} rx={Math.min(r, h / 4)} fill={p.ac} />,
        <Rect key={key + 'b'} {...box} fill="none" stroke={p.ac} strokeWidth={sw} />,
      ];
    case 's':
      return <Rect key={key} {...box} fill="none" stroke={p.fa} strokeWidth={sw} strokeDasharray={`${Math.max(1.5, sw * 1.6)} ${Math.max(1.5, sw * 1.4)}`} />;
    case 'm':
      return [
        <Line key={key + 'a'} x1={x + w * 0.1} y1={y + h * 0.9} x2={x + w * 0.9} y2={y + h * 0.1} stroke={p.mu} strokeWidth={Math.max(1, w * 0.2)} />,
        <Rect key={key + 'b'} {...box} fill="none" stroke={p.mu} strokeWidth={sw} />,
      ];
    case 'g':
      return [
        <Rect key={key + 'a'} x={x} y={y} width={w} height={h} rx={r} fill="url(#hfStripes)" />,
        <Rect key={key + 'b'} {...box} fill="none" stroke={p.ac} strokeWidth={sw} />,
      ];
    case 'n':
      return <Rect key={key} {...box} fill="none" stroke={p.ln} strokeWidth={sw} />;
    case 'o':
      return <Rect key={key} x={x} y={y} width={w} height={h} rx={r} fill={p.sf} />;
    case 'f':
      return null;
  }
}

export function StripeDefs({ p }: { p: Palette }) {
  return (
    <Defs>
      <Pattern id="hfStripes" patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
        <Rect x={0} y={0} width={3} height={6} fill={p.ac} />
      </Pattern>
    </Defs>
  );
}

/** A single status square. */
export function Cell({ s, size = 14, w, h, r = 4, sw = 1.5, style }: { s: CellKind; size?: number; w?: number; h?: number; r?: number; sw?: number; style?: StyleProp<ViewStyle> }) {
  const { p } = useT();
  const W = w ?? size;
  const H = h ?? size;
  return (
    <Svg width={W} height={H} style={style}>
      {s === 'g' && <StripeDefs p={p} />}
      {cellShapes(p, s, 0, 0, W, H, r, sw, 0)}
    </Svg>
  );
}

/** A row of status cells that stretches to its container's width. */
export function Strip({ cells, height = 12, gap = 2, r = 3, sw = 1.5 }: { cells: CellKind[]; height?: number; gap?: number; r?: number; sw?: number }) {
  const { p } = useT();
  const [w, setW] = useState(0);
  const cw = w ? (w - gap * (cells.length - 1)) / cells.length : 0;
  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {cells.includes('g') && <StripeDefs p={p} />}
          {cells.map((s, i) => cellShapes(p, s, i * (cw + gap), 0, cw, height, r, sw, i))}
        </Svg>
      )}
    </View>
  );
}

/** A grid of status cells: `rows` tall, filled column by column (the contribution graph). */
export function Heatmap({ cells, rows = 7, gap = 2, r = 3 }: { cells: CellKind[]; rows?: number; gap?: number; r?: number }) {
  const { p } = useT();
  const [w, setW] = useState(0);
  const cols = Math.ceil(cells.length / rows);
  const cs = w ? (w - gap * (cols - 1)) / cols : 0;
  const H = cs * rows + gap * (rows - 1);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H || 100 }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {cells.map((s, i) => cellShapes(p, s, Math.floor(i / rows) * (cs + gap), (i % rows) * (cs + gap), cs, cs, r, 1, i))}
        </Svg>
      )}
    </View>
  );
}

/** Rounded bar chart; bars grow from the baseline on mount. */
export function Bars({ values, height, gap = 4, colors, glowIndex, track = true, labels, labelSize = 10 }: { values: number[]; height: number; gap?: number; colors: string[]; glowIndex?: number; track?: boolean; labels?: string[]; labelSize?: number }) {
  const { p, t2 } = useT();
  const grow = useAnim(t2 ? 0 : 1);
  useEffect(() => {
    if (t2) Animated.timing(grow, { toValue: 1, duration: t2, useNativeDriver: true }).start();
  }, [grow, t2]);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', backgroundColor: track ? p.sf : 'transparent', borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, overflow: 'hidden' }}>
            <Animated.View
              style={{
                height: `${Math.max(0, Math.min(1, v)) * 100}%`,
                backgroundColor: colors[i],
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                boxShadow: i === glowIndex ? p.glow : undefined,
                transform: [{ scaleY: grow }],
                transformOrigin: 'bottom',
              }}
            />
          </View>
        ))}
      </View>
      {labels && (
        <View style={{ flexDirection: 'row', gap }}>
          {labels.map((l, i) => (
            <Txt key={i} size={labelSize} w={500} color={p.mu} numberOfLines={1} style={{ flex: 1, overflow: 'visible' }}>
              {l}
            </Txt>
          ))}
        </View>
      )}
    </View>
  );
}

/** Glowing trend line with a soft area and a ringed end point. Values 0..1. */
export function TrendLine({ values, height = 56 }: { values: number[]; height?: number }) {
  const { p } = useT();
  const [w, setW] = useState(0);
  const pts = values.map((v, k) => [(k * w) / Math.max(1, values.length - 1), height - 4 - v * (height - 8)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height} style={{ overflow: 'visible' }}>
          <Polygon points={`0,${height} ${line} ${w},${height}`} fill={p.act} opacity={0.55} />
          <Polyline points={line} fill="none" stroke={p.ac} strokeWidth={6} strokeOpacity={0.18} strokeLinejoin="round" />
          <Polyline points={line} fill="none" stroke={p.ac} strokeWidth={2} strokeLinejoin="round" />
          {last && <Circle cx={last[0]} cy={last[1]} r={3.5} fill={p.bg} stroke={p.ac} strokeWidth={2} />}
        </Svg>
      )}
    </View>
  );
}

/** Today's progress ring. */
export function Ring({ frac, size = 92, stroke = 5, children }: { frac: number; size?: number; stroke?: number; children?: ReactNode }) {
  const { p } = useT();
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const dash = `${(Math.max(0, Math.min(1, frac)) * c).toFixed(1)} ${c.toFixed(1)}`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.sf2} strokeWidth={stroke} />
        {frac > 0 && <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.ac} strokeOpacity={0.25} strokeWidth={stroke + 6} strokeLinecap="round" strokeDasharray={dash} />}
        {frac > 0 && <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.ac} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={dash} />}
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

/** Proportional segment bar (routine step times, storage, check-in mix). */
export function Segments({ parts, height = 14, gap = 2, radius = 8, track }: { parts: { w: number; color?: string; node?: ReactNode }[]; height?: number; gap?: number; radius?: number; track?: string }) {
  return (
    <View style={{ flexDirection: 'row', height, gap, borderRadius: radius, overflow: 'hidden', backgroundColor: track }}>
      {parts.filter((x) => x.w > 0).map((x, i) => (
        <View key={i} style={{ width: `${x.w * 100}%`, flexShrink: 1, borderRadius: radius, backgroundColor: x.color, overflow: 'hidden' }}>
          {x.node}
        </View>
      ))}
    </View>
  );
}

/** Vertical fill for "partial" swatches: accent bottom half on a tint. */
export function HalfFill({ top, bottom }: { top: string; bottom: string }) {
  return <LinearGradient colors={[top, top, bottom, bottom]} locations={[0, 0.5, 0.5, 1]} style={{ flex: 1 }} />;
}

/** Hatched fill for "skipped" in the check-in mix bar. */
export function Hatch({ color }: { color: string }) {
  const [w, setW] = useState(0);
  return (
    <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height="100%">
        {Array.from({ length: Math.ceil(w / 5) }, (_, i) => (
          <Rect key={i} x={i * 5} y={0} width={2} height="100%" fill={color} />
        ))}
      </Svg>
    </View>
  );
}

/** A pressable status square used by the month calendar. */
export function PressCell({ children, onPress, style, label }: { children: ReactNode; onPress?: () => void; style: StyleProp<ViewStyle>; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={style}>
      {children}
    </Pressable>
  );
}
