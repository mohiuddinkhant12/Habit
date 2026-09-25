import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import type { WidgetModel } from './model';

const c = (x: string) => x as ColorProp;
const INTER = 'Inter_500Medium';
const INTER_LIGHT = 'Inter_300Light';

export const WIDGETS = ['Today', 'Progress', 'Streaks', 'QuickAdd'] as const;
export type WidgetName = (typeof WIDGETS)[number];

function Label({ m, text }: { m: WidgetModel; text: string }) {
  return <TextWidget text={text.toUpperCase()} style={{ fontSize: 10, letterSpacing: 0.14, color: c(m.p.lbl), fontFamily: INTER }} />;
}

export function TodayWidget({ m }: { m: WidgetModel }) {
  const { p } = m;
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c(p.bg), borderRadius: 14, padding: 12, flexDirection: 'column' }}>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent', marginBottom: 6 }}>
        <TextWidget text="Today" style={{ fontSize: 12, color: c(p.tx), fontFamily: INTER }} />
        <TextWidget text={`${m.done}/${m.total}`} style={{ fontSize: 12, color: c(p.tx), fontFamily: INTER }} />
      </FlexWidget>
      {m.pending.map((h) => (
        <FlexWidget key={h.id} style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: 40 }}>
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget text={h.name} maxLines={1} truncate="END" style={{ fontSize: 12.5, color: c(p.tx), fontFamily: INTER }} />
          </FlexWidget>
          <TextWidget text={h.val} style={{ fontSize: 11.5, color: c(p.mu), marginRight: 8 }} />
          <FlexWidget
            clickAction={h.action === 'play' ? 'OPEN_URI' : 'LOG'}
            clickActionData={h.action === 'play' ? { uri: `habitflow://start/${h.id}` } : { id: h.id }}
            accessibilityLabel={`Log ${h.name}`}
            style={{ width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: c(p.ln2), alignItems: 'center', justifyContent: 'center' }}
          >
            <TextWidget text={h.action === 'plus' ? '+' : h.action === 'play' ? '▶' : '✓'} style={{ fontSize: 13, color: c(p.tx) }} />
          </FlexWidget>
        </FlexWidget>
      ))}
      {m.pending.length === 0 && <TextWidget text="All caught up. Nice." style={{ fontSize: 12, color: c(p.mu), marginTop: 6 }} />}
    </FlexWidget>
  );
}

export function ProgressWidget({ m }: { m: WidgetModel }) {
  const { p } = m;
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c(p.bg), borderRadius: 14, padding: 12, flexDirection: 'column', justifyContent: 'space-between' }}>
      <Label m={m} text="Progress" />
      <TextWidget text={m.pct} style={{ fontSize: 40, color: c(p.tx), fontFamily: INTER_LIGHT, letterSpacing: -0.05 }} />
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', height: 10 }}>
        {m.segs.map((on, i) => (
          <FlexWidget key={i} style={{ flex: 1, height: 10, borderRadius: 14, marginRight: i < m.segs.length - 1 ? 2 : 0, backgroundColor: c(on ? p.ac : p.sf2) }} />
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

export function StreaksWidget({ m }: { m: WidgetModel }) {
  const { p } = m;
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c(p.act), borderRadius: 14, padding: 12, flexDirection: 'column' }}>
      <TextWidget text="STREAKS" style={{ fontSize: 10.5, letterSpacing: 0.08, color: c(p.acx), fontFamily: INTER }} />
      {m.streaks.map((s) => (
        <FlexWidget key={s.name} style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end' }}>
          <TextWidget text={String(s.n)} style={{ fontSize: 30, color: c(p.acx), fontFamily: INTER }} />
          <TextWidget text={s.name} maxLines={1} truncate="END" style={{ fontSize: 11, color: c(p.acx) }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function QuickAddWidget({ m }: { m: WidgetModel }) {
  const { p } = m;
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c(p.bg), borderRadius: 14, flexDirection: 'row' }}>
      {m.quick.map((q) => (
        <FlexWidget key={q.id} clickAction="LOG" clickActionData={{ id: q.id }} accessibilityLabel={q.label} style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'center', paddingHorizontal: 12 }}>
          <TextWidget text={q.label} style={{ fontSize: 12, color: c(p.tx), fontFamily: INTER }} />
          <TextWidget text={q.val} style={{ fontSize: 11, color: c(p.mu) }} />
        </FlexWidget>
      ))}
      {m.quick.length === 0 && <TextWidget text="Add an amount habit to log it here." style={{ fontSize: 12, color: c(p.mu), padding: 12 }} />}
    </FlexWidget>
  );
}

export function renderWidget(name: string, m: WidgetModel) {
  switch (name as WidgetName) {
    case 'Progress':
      return <ProgressWidget m={m} />;
    case 'Streaks':
      return <StreaksWidget m={m} />;
    case 'QuickAdd':
      return <QuickAddWidget m={m} />;
    default:
      return <TodayWidget m={m} />;
  }
}
