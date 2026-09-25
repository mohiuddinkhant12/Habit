import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Bars, Cell, HalfFill, Hatch, Segments, Strip, TrendLine } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { Btn, Card, Label, Legend, Page, Rule, Swatch, Txt } from '@/components/ui';
import { computeInsights, type Period } from '@/domain/insights';
import { fmtNum } from '@/domain/goals';
import { useData } from '@/store/data';
import { useHabitSets, useStreakOpts, useToday } from '@/store/hooks';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';

export default function InsightsScreen() {
  const { p } = useT();
  const router = useRouter();
  const today = useToday();
  const { act } = useHabitSets();
  const log = useData((s) => s.log);
  const mom = useData((s) => s.settings.recovery === 'Momentum');
  const opts = useStreakOpts();
  const [period, setPeriod] = useState<Period>('Week');
  const ins = useMemo(() => computeInsights(act, log, today, period, opts), [act, log, today, period, opts]);
  const pct = (v: number) => Math.round(v * 100) + '%';
  const dd = ins.delta;
  const trend = dd >= 3 ? `Up ${dd} pts on ${ins.compareTo} — momentum is building` : dd <= -3 ? `${Math.abs(dd)} pts below ${ins.compareTo}. Busy stretches happen — the long view matters more.` : `Steady — within ${Math.abs(dd)} ${Math.abs(dd) === 1 ? 'pt' : 'pts'} of ${ins.compareTo}`;
  const ct = ins.counts.d + ins.counts.p + ins.counts.s + ins.counts.m || 1;
  const perfSz = period === 'Week' ? 28 : period === 'Month' ? 14 : 8;
  const gap = period === 'Month' ? 3 : period === 'Week' ? 10 : 6;

  const strk = ins.streaks
    .sort((a, b) => (mom ? b.momentum - a.momentum : b.current - a.current))
    .slice(0, 5);
  const mx = Math.max(1, ...strk.map((s) => s.best));

  return (
    <Page>
      <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Txt size={24} ls={-0.025} accessibilityRole="header">Insights</Txt>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', padding: 3, gap: 2, borderRadius: 8, backgroundColor: p.sf }}>
          {(['Week', 'Month', 'Quarter'] as Period[]).map((o) => (
            <Pressable key={o} accessibilityRole="radio" accessibilityState={{ selected: o === period }} onPress={() => setPeriod(o)} style={{ height: 30, borderRadius: 6, paddingHorizontal: 10, justifyContent: 'center', backgroundColor: o === period ? p.act : 'transparent' }}>
              <Txt size={11.5} w={500} color={o === period ? p.acx : p.mu}>{o}</Txt>
            </Pressable>
          ))}
        </View>
      </View>

      {ins.logged < 7 ? (
        <View>
          <Rule />
          <View style={{ paddingVertical: 28, paddingHorizontal: 20, gap: 10 }}>
            <Txt size={24} w={500} ls={-0.025} lh={1.1}>Patterns need about a week.</Txt>
            <Txt size={13} lh={1.5} color={p.mu}>Keep checking in. After seven check-ins you’ll see your best days, strongest habits and how your week is trending.</Txt>
            <View style={{ flexDirection: 'row', gap: 3, marginTop: 6 }}>
              {Array.from({ length: 7 }, (_, k) => (
                <View key={k} style={{ flex: 1, height: 28, borderRadius: 8, backgroundColor: k < ins.logged ? p.ac : p.sf2 }} />
              ))}
            </View>
            <Txt size={11.5} color={p.mu}>{ins.logged} of 7 check-ins so far</Txt>
          </View>
        </View>
      ) : (
        <>
          <Rule />
          <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 18, gap: 6 }}>
            <Label>{ins.rangeLabel}</Label>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
              <Txt size={63} w={300} ls={-0.05} lh={0.9} tab>{pct(ins.rate)}</Txt>
              <Txt size={12} lh={1.3} color={p.mu} style={{ paddingBottom: 4 }}>of planned{'\n'}check-ins done</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Icon name={dd >= 3 ? 'trend-up' : dd <= -3 ? 'trend-down' : 'arrow-right'} size={16.5} color={p.ac} />
              <Txt size={12.5} w={500} style={{ flex: 1 }}>{trend}</Txt>
            </View>
            <View style={{ marginTop: 14 }}>
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: p.ln }} />
              <View style={{ position: 'absolute', left: 0, right: 0, top: 66, borderTopWidth: 1, borderStyle: 'dashed', borderColor: p.ln }} />
              <Bars
                values={ins.bars.map((b) => b.v)}
                height={132}
                gap={gap}
                colors={ins.bars.map((b) => (b.current ? p.ac : p.bar))}
                glowIndex={ins.bars.findIndex((b) => b.current)}
                labels={ins.bars.map((b) => b.label)}
                labelSize={10.5}
              />
            </View>
            <Legend items={[{ label: 'Done', swatch: <Swatch color={p.bar} /> }, { label: 'Planned', swatch: <Swatch color={p.sf} /> }, { label: 'Current', swatch: <Swatch color={p.ac} /> }]} />
          </View>

          <Rule />
          <View style={{ padding: 16, paddingHorizontal: 20, gap: 10 }}>
            <Label>How check-ins landed</Label>
            <Segments
              height={14}
              radius={8}
              parts={[
                { w: ins.counts.d / ct, color: p.ac },
                { w: ins.counts.p / ct, node: <HalfFill top={p.act} bottom={p.ac} /> },
                { w: ins.counts.s / ct, node: <Hatch color={p.fa} /> },
                { w: ins.counts.m / ct, color: p.sf2 },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: 1, backgroundColor: p.ln, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden' }}>
              {([['d', 'Done'], ['p', 'Partial'], ['s', 'Skipped'], ['m', 'Missed']] as const).map(([k, l]) => (
                <Card key={k} radius={10} style={{ flex: 1, padding: 8, gap: 4 }}>
                  <Cell s={k} size={14} r={7} />
                  <Txt size={16.5} w={500} tab>{Math.round((ins.counts[k] / ct) * 100)}%</Txt>
                  <Txt size={11} color={p.mu} numberOfLines={1}>{l} · {ins.counts[k]}</Txt>
                </Card>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8, paddingHorizontal: 16 }}>
            <Card style={{ flex: 1, padding: 14, gap: 8 }}>
              <Label>Full days</Label>
              <Txt size={24} w={500} ls={-0.025} lh={1}>{ins.fullDays.filter(Boolean).length}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                {ins.fullDays.map((f, i) => (
                  <View key={i} style={{ width: perfSz, height: perfSz, borderRadius: Math.min(8, perfSz / 3), backgroundColor: f ? p.ac : ins.fullDaysAny[i] ? p.sf2 : 'transparent', borderWidth: 1.5, borderColor: f ? p.ac : p.sf2 }} />
                ))}
              </View>
            </Card>
            <Card style={{ flex: 1, padding: 14, gap: 8 }}>
              <Label>12-week trend</Label>
              <Txt size={24} w={500} ls={-0.025} lh={1}>{pct(ins.weeks[11])}</Txt>
              <TrendLine values={ins.weeks} height={56} />
              <Txt size={11} color={p.mu}>from {pct(ins.weeks[0])}</Txt>
            </Card>
          </View>

          <Rule />
          <View style={{ padding: 16, paddingHorizontal: 20, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Txt size={16.5} w={500}>{ins.monthName}</Txt>
              <Txt size={11} color={p.mu}>Tap a day</Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {ins.weekday.map((w, i) => (
                <Txt key={i} size={10.5} w={500} color={p.mu} style={{ flex: 1 }}>{w.label}</Txt>
              ))}
            </View>
            {Array.from({ length: ins.calendar.length / 7 }, (_, r) => (
              <View key={r} style={{ flexDirection: 'row', gap: 3 }}>
                {ins.calendar.slice(r * 7, r * 7 + 7).map((c, i) => (
                  <Pressable
                    key={i}
                    disabled={!c.key || c.future}
                    accessibilityRole="button"
                    accessibilityLabel={c.key ? `${c.day}, ${c.future ? 'upcoming' : ['nothing done', 'some done', 'half done', 'most done', 'all done'][c.level]}` : undefined}
                    onPress={() => c.key && useUI.getState().openSheet({ k: 'day', date: c.key })}
                    style={{ flex: 1, aspectRatio: 1, borderWidth: 1.5, borderColor: c.today ? p.tx : c.future ? p.sf2 : 'transparent', borderRadius: 6, backgroundColor: c.level < 0 ? 'transparent' : p.heat[c.level], paddingVertical: 3, paddingHorizontal: 4, justifyContent: 'space-between' }}
                  >
                    {c.day > 0 && <Txt size={11.5} w={500} tab color={c.level >= 3 ? p.onac : c.future ? p.fa : p.tx}>{c.day}</Txt>}
                    {c.level === 4 && <Icon name="check" size={11} color={p.onac} style={{ alignSelf: 'flex-end' }} />}
                  </Pressable>
                ))}
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt size={11} color={p.mu}>Less</Txt>
              {p.heat.map((c, i) => <Swatch key={i} color={c} size={12} />)}
              <Txt size={11} color={p.mu}>All done ✓</Txt>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8, paddingHorizontal: 16 }}>
            <Card style={{ flex: 1, padding: 14, paddingBottom: 16, gap: 8 }}>
              <Label>Weekday rhythm</Label>
              <Bars values={ins.weekday.map((w) => w.v)} height={72} gap={4} colors={ins.weekday.map((w) => (w.best ? p.ac : p.bar))} labels={ins.weekday.map((w) => w.label)} />
              <Txt size={11.5} lh={1.4}>
                <Txt size={11.5} w={600}>{ins.bestWeekday}s</Txt> are strongest at {pct(Math.max(...ins.weekday.map((w) => w.v)))}.
              </Txt>
            </Card>
            <Card style={{ flex: 1, padding: 14, paddingBottom: 16, gap: 8 }}>
              <Label>Time of day</Label>
              <View style={{ flex: 1, gap: 7, justifyContent: 'center' }}>
                {ins.timeOfDay.map((t) => (
                  <View key={t.label} style={{ gap: 3 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Txt size={11}>{t.label}</Txt>
                      <Txt size={11} w={500} tab>{pct(t.v)}</Txt>
                    </View>
                    <View style={{ height: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: p.sf }}>
                      <View style={{ height: 6, width: pct(t.v) as `${number}%`, borderRadius: 99, backgroundColor: t.best ? p.ac : p.bar }} />
                    </View>
                  </View>
                ))}
              </View>
              <Txt size={11.5} lh={1.4}>
                <Txt size={11.5} w={600}>{ins.timeOfDay.find((t) => t.best)?.label}</Txt> habits stick best.
              </Txt>
            </Card>
          </View>

          <Rule />
          <View style={{ paddingTop: 16, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingBottom: 8 }}>
              <Label>By habit · last 14 days</Label>
              <Txt size={11} color={p.mu}>{fmtNum(ins.checkins)} check-ins</Txt>
            </View>
            {ins.byHabit.map(({ h, v, strip }) => (
              <Pressable key={h.id} accessibilityRole="button" accessibilityLabel={`${h.name}, ${pct(v)}`} onPress={() => router.push(`/habit/${h.id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 20, backgroundColor: pressed ? p.sf : 'transparent' })}>
                <Icon name={h.icon} size={14.5} color={p.tx} style={{ width: 20 }} />
                <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                  <Txt size={12.5} w={500} numberOfLines={1}>{h.name}</Txt>
                  <Strip cells={strip} height={12} />
                </View>
                <Txt size={13} w={500} tab style={{ width: 40 }}>{pct(v)}</Txt>
              </Pressable>
            ))}
            <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 4 }}>
              <Legend
                items={[
                  { label: 'Done', swatch: <Cell s="d" size={11} r={3} /> },
                  { label: 'Partial', swatch: <Cell s="p" size={11} r={3} /> },
                  { label: 'Skipped', swatch: <Cell s="s" size={11} r={3} /> },
                  { label: 'Missed', swatch: <Cell s="m" size={11} r={3} /> },
                  { label: 'Off', swatch: <Cell s="o" size={11} r={3} /> },
                ]}
              />
            </View>
          </View>

          <Rule />
          <View style={{ padding: 16, paddingHorizontal: 20, gap: 10 }}>
            <Label>{mom ? 'Momentum · 30 days' : 'Streaks'}</Label>
            {strk.map((s) => (
              <View key={s.h.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Txt size={12} w={500}>
                    {s.h.name}{' '}
                    {!mom && s.current >= s.best && s.current > 0 && <Txt size={11} w={500} color={p.acx}>Personal best</Txt>}
                  </Txt>
                  <Txt size={11} color={p.mu} tab>
                    <Txt size={13.5} w={600} tab>{mom ? s.momentum + '%' : s.current}</Txt>
                    {mom ? '' : ' best ' + s.best}
                  </Txt>
                </View>
                <View style={{ height: 10, borderRadius: 99, backgroundColor: p.sf }}>
                  {!mom && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(s.best / mx) * 100}%`, borderRightWidth: 1, borderColor: p.ln }} />}
                  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${mom ? s.momentum : (s.current / mx) * 100}%`, borderRadius: 99, overflow: 'hidden', backgroundColor: p.ac, boxShadow: p.glow }} />
                </View>
              </View>
            ))}
          </View>

          {ins.correlation && (
            <View>
              <Rule />
              <View style={{ padding: 16, paddingHorizontal: 20, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Label>Pattern</Label>
                  <View style={{ paddingVertical: 3, paddingHorizontal: 6, borderWidth: 1, borderColor: p.ln2, borderRadius: 14 }}>
                    <Txt size={10.5} w={500}>Correlation, not cause</Txt>
                  </View>
                </View>
                {[
                  { l: ins.correlation.a.name, icon: ins.correlation.a.icon, v: ins.correlation.withA, strong: true },
                  { l: 'Didn’t', icon: null, v: ins.correlation.withoutA, strong: false },
                ].map((r) => (
                  <View key={r.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 84, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {r.icon && <Icon name={r.icon} size={12} color={p.tx} />}
                      <Txt size={11.5} w={r.strong ? 500 : 400} color={r.strong ? p.tx : p.mu} numberOfLines={1} style={{ flexShrink: 1 }}>{r.l}</Txt>
                    </View>
                    <View style={{ flex: 1, height: 18, borderRadius: 5, backgroundColor: p.sf, overflow: 'hidden' }}>
                      <View style={{ height: 18, width: pct(r.v) as `${number}%`, borderRadius: r.strong ? 99 : 5, backgroundColor: r.strong ? p.ac : p.bar, boxShadow: r.strong ? p.glow : undefined }} />
                    </View>
                    <Txt size={11.5} w={500} tab style={{ width: 36 }}>{pct(r.v)}</Txt>
                  </View>
                ))}
                <Txt size={12} lh={1.45} color={p.mu}>
                  On days you complete {ins.correlation.a.name}, you also finish {ins.correlation.b.name} {pct(ins.correlation.withA)} of the time, compared with {pct(ins.correlation.withoutA)} on days you don’t. Based on the last 90 days.
                </Txt>
              </View>
            </View>
          )}

          <Rule />
          <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <Btn label="Review today" icon="arrow-right" onPress={() => router.push('/review')} />
          </View>
        </>
      )}
    </Page>
  );
}

