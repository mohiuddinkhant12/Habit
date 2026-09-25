import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';

import { Bars, Cell, Heatmap, TrendLine } from '@/components/charts';
import { habitSub, valFor } from '@/components/habitVM';
import { Icon } from '@/components/Icon';
import { AppBar, Bar, Btn, Card, IconBtn, Label, Legend, Page, Rule, Txt } from '@/components/ui';
import { longD } from '@/domain/dates';
import { fmtNum } from '@/domain/goals';
import { habitDetail, isNew } from '@/domain/insights';
import { streakOf } from '@/domain/status';
import { togglePause } from '@/store/actions';
import { useData } from '@/store/data';
import { useStreakOpts, useToday } from '@/store/hooks';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';

export default function HabitDetail() {
  const { p } = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const opts = useStreakOpts();
  const h = useData((s) => s.habits.find((x) => x.id === id));
  const habits = useData((s) => s.habits);
  const log = useData((s) => s.log);
  const mom = useData((s) => s.settings.recovery === 'Momentum');
  const dv = useMemo(() => (h ? habitDetail(h, log, today, opts) : null), [h, log, today, opts]);
  const st = useMemo(() => (h ? streakOf(h, log, today, opts) : null), [h, log, today, opts]);

  // Leave the screen once this habit is archived or deleted from here (history is kept either way).
  const live = !!h && !h.archived;
  const wasLive = useRef(live);
  useEffect(() => {
    if (wasLive.current && !live && router.canGoBack()) router.back();
    wasLive.current = live;
  }, [live, router]);

  if (!h || !dv || !st) {
    return (
      <Page bar={<AppBar />}>
        <View style={{ padding: 20, gap: 8 }}>
          <Txt size={20} w={500}>This habit is gone.</Txt>
          <Txt size={12.5} color={p.mu}>It may have been deleted. Undo from the last message if that was a mistake.</Txt>
        </View>
      </Page>
    );
  }
  const fresh = isNew(h, log, today);
  const anchor = h.stackAfter ? habits.find((x) => x.id === h.stackAfter) : null;
  const unit = st.unit === 'weeks' ? 'wk' : '';
  const stats = mom
    ? [
        { l: 'Momentum', v: dv.momentum + '%', w: dv.momentum / 100 },
        { l: 'Best streak', v: String(st.best) + unit, w: 1 },
        { l: 'All-time', v: fmtNum(dv.total), w: Math.min(1, dv.total / 180) },
      ]
    : [
        { l: 'Streak', v: String(st.current) + unit, w: st.current / Math.max(1, st.best) },
        { l: 'Best streak', v: String(st.best) + unit, w: 1 },
        { l: '30 days', v: dv.rate30 + '%', w: dv.rate30 / 100 },
      ];

  return (
    <Page
      stickyHeaderIndices={[0]}
      bar={null}
    >
      <AppBar
        right={
          <>
            <IconBtn icon="pencil-simple" label="Edit" onPress={() => router.push({ pathname: '/habit/form', params: { id: h.id } })} />
            <IconBtn icon="dots-three-vertical" label="More" onPress={() => useUI.getState().openSheet({ k: 'actions', id: h.id })} />
          </>
        }
      />
      <View style={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 16, gap: 6 }}>
        <Icon name={h.icon} size={28} color={p.ac} />
        <Txt size={24} w={500} ls={-0.025} lh={1.1} accessibilityRole="header">{h.name}</Txt>
        <Txt size={12} color={p.mu}>{habitSub(h)}{h.paused ? ' · Paused' : ''}{h.archived ? ' · Archived' : ''}</Txt>
        {anchor && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Icon name="stack" size={13} color={p.ac} />
            <Txt size={12} numberOfLines={1}>Stacked after <Txt size={12} w={600}>{anchor.name}</Txt></Txt>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 1, backgroundColor: p.ln, marginHorizontal: 16, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden' }}>
        {stats.map((s) => (
          <Card key={s.l} radius={10} style={{ flex: 1, paddingVertical: 12, paddingRight: 12, paddingLeft: 14, gap: 6 }}>
            <Label>{s.l}</Label>
            <Txt size={24} w={500} ls={-0.025} lh={1} tab>{s.v}</Txt>
            <Bar v={s.w} height={4} />
          </Card>
        ))}
      </View>

      {fresh && (
        <View style={{ paddingVertical: 24, paddingHorizontal: 20, gap: 8 }}>
          <Txt size={20} w={500}>History starts today.</Txt>
          <Txt size={12.5} lh={1.5} color={p.mu}>Every check-in fills a square below. After a week you’ll see your best days and patterns here.</Txt>
        </View>
      )}

      <View style={{ padding: 16, paddingHorizontal: 20, gap: 8 }}>
        <Label>Last 26 weeks</Label>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {dv.monthLabels.map((l, i) => (
            <Txt key={i} size={9.5} w={500} color={p.mu} numberOfLines={1} style={{ flex: 1, overflow: 'visible', height: 12 }}>{l}</Txt>
          ))}
        </View>
        <Heatmap cells={dv.cells.map((c) => (st.covered.includes(c.k) ? 'g' : c.s))} rows={7} gap={2} r={3} />
        <Legend items={[{ label: 'Done', swatch: <Cell s="d" size={10} r={3} sw={1} /> }, { label: 'Partial', swatch: <Cell s="p" size={10} r={3} sw={1} /> }, { label: 'Skipped', swatch: <Cell s="s" size={10} r={3} sw={1} /> }, { label: 'Missed', swatch: <Cell s="m" size={10} r={3} sw={1} /> }, ...(st.covered.length ? [{ label: 'Grace day', swatch: <Cell s="g" size={10} r={3} sw={1} /> }] : [])]} />
      </View>

      {!fresh && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8, paddingHorizontal: 16 }}>
            <Card style={{ flex: 1, padding: 14, gap: 8 }}>
              <Label>By weekday</Label>
              <Bars values={dv.weekday.map((w) => w.v)} height={64} gap={4} colors={dv.weekday.map((w) => (w.best ? p.ac : p.bar))} labels={dv.weekday.map((w) => w.label)} />
            </Card>
            <Card style={{ flex: 1, padding: 14, gap: 8 }}>
              <Label>Weekly trend</Label>
              <TrendLine values={dv.weeks} height={64} />
              <Txt size={11} color={p.mu}>{Math.round(dv.weeks[0] * 100)}% → {Math.round(dv.weeks[11] * 100)}% over 12 weeks</Txt>
            </Card>
          </View>

          <Rule />
          <View style={{ paddingVertical: 14, paddingHorizontal: 20 }}>
            <Label style={{ paddingBottom: 6 }}>What we noticed</Label>
            {dv.notes.map((t) => (
              <View key={t} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: p.ac, marginTop: 6 }} />
                <Txt size={12.5} lh={1.45} style={{ flex: 1 }}>{t}</Txt>
              </View>
            ))}
          </View>

          <Rule />
          <View style={{ paddingTop: 14, paddingBottom: 4 }}>
            <Label style={{ paddingHorizontal: 20, paddingBottom: 6 }}>History</Label>
            {dv.history.map((e) => (
              <View key={e.k} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'flex-start' }}>
                <Cell s={st.covered.includes(e.k) ? 'g' : e.s} size={16} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt size={12.5} w={500}>{longD(e.k, today)}</Txt>
                    <Txt size={12.5} color={p.mu}>{st.covered.includes(e.k) ? 'Grace day' : valFor(h, e.s, log[h.id]?.[e.k]?.v)}</Txt>
                  </View>
                  {e.note ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Icon name="note" size={12} color={p.mu} style={{ marginTop: 2 }} />
                      <Txt size={12} color={p.mu} style={{ flex: 1 }}>{e.note}</Txt>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 16, paddingHorizontal: 20 }}>
        <Btn label={h.paused ? 'Resume' : 'Pause'} icon={h.paused ? 'play' : 'pause'} size={12} style={{ flex: 1, paddingHorizontal: 12 }} onPress={() => togglePause(h.id)} />
        <Btn label="Archive" icon="archive" size={12} style={{ flex: 1, paddingHorizontal: 12 }} onPress={() => useUI.getState().openDialog({ k: 'archive', id: h.id })} />
      </View>
    </Page>
  );
}
