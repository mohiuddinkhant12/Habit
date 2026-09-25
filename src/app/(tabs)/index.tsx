import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cell, Ring, type CellKind } from '@/components/charts';
import { habitVM, type HabitVM } from '@/components/habitVM';
import { Icon } from '@/components/Icon';
import { Fab, HabitRow, HabitTile } from '@/components/today';
import { Btn, IconBtn, Label, Rule, Txt } from '@/components/ui';
import { CATS, TIMES, XP_PER_LEVEL } from '@/domain/catalog';
import { addDays, DL, DOW_LONG, MON, dateOf, hhmm, range, weekStartOf, weekdayOf, DOW } from '@/domain/dates';
import { dayStat, momentumOf, rate, statusOn, streakOf } from '@/domain/status';
import { dismissRecovery, logYesterday } from '@/store/actions';
import { useData } from '@/store/data';
import { useHabitSets, useStreakOpts, useToday } from '@/store/hooks';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';
import { alpha } from '@/theme/color';

export default function TodayScreen() {
  const { p } = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const today = useToday();
  const { all, act } = useHabitSets();
  const log = useData((s) => s.log);
  const settings = useData((s) => s.settings);
  const xp = useData((s) => s.xp);
  const dismissed = useData((s) => s.recoveryDismissed);
  const opts = useStreakOpts();

  const vms = useMemo(() => act.map((h) => habitVM(h, log, today, settings, opts)), [act, log, today, settings, opts]);
  const dn = vms.filter((v) => v.done).length;
  const tot = vms.length;
  const now = hhmm(new Date());
  const hour = new Date().getHours();

  const groups = useMemo(() => {
    let g: { title: string; items: HabitVM[] }[];
    if (settings.groupBy === 'Time of day') g = TIMES.map((t) => ({ title: t, items: vms.filter((v) => v.h.time === t) }));
    else if (settings.groupBy === 'Category') g = CATS.map((c) => ({ title: c, items: vms.filter((v) => v.h.cat === c) }));
    else g = [{ title: 'All habits', items: vms }];
    return g.filter((x) => x.items.length);
  }, [vms, settings.groupBy]);

  const pend = vms.filter((v) => !v.done && !v.skipped && v.h.reminder && v.h.reminder > now).sort((a, b) => (a.h.reminder! < b.h.reminder! ? -1 : 1))[0];
  const headline = tot === 0 ? '' : dn === tot ? 'Everything done — that’s a full day.' : dn === 0 ? 'A fresh day. Start with one.' : dn / tot >= 0.5 ? `${tot - dn} to go. You’re past halfway.` : `${tot - dn} to go. Nice start.`;
  const greeting = tot && dn === tot ? 'Good work today' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const segs = [...vms].sort((a, b) => score(b) - score(a));
  const lvl = Math.floor(xp / XP_PER_LEVEL) + 1;

  const week = range(weekStartOf(today, settings.weekStart), addDays(weekStartOf(today, settings.weekStart), 6)).map((k) => {
    const fut = k > today;
    const st = fut ? { due: 0, done: 0 } : dayStat(act, log, k, today);
    const frac = k === today ? (tot ? dn / tot : 0) : st.due ? st.done / st.due : 0;
    return { k, fut, frac, isToday: k === today };
  });

  const rec = useRecovery(dismissed === today);
  const td = dateOf(today);

  if (!all.length) return <EmptyToday />;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: ins.top }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 6, paddingRight: 6, paddingLeft: 20 }}>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt size={12} color={p.mu}>{greeting}</Txt>
            <Txt size={22} ls={-0.025} lh={1.25} accessibilityRole="header">
              {DOW_LONG[weekdayOf(today)]}, <Txt size={22} ls={-0.025} color={p.mu}>{MON[td.getMonth()]} {td.getDate()}</Txt>
            </Txt>
          </View>
          <IconBtn icon="magnifying-glass" label="Search" onPress={() => router.push('/search')} />
          <IconBtn icon="notebook" label="Daily review" onPress={() => router.push('/review')} />
        </View>

        <View style={{ flexDirection: 'row', gap: 4, marginTop: 12, marginHorizontal: 16 }}>
          {week.map((d) => (
            <Pressable
              key={d.k}
              accessibilityRole="button"
              accessibilityLabel={`${d.fut ? 'Upcoming ' : ''}${DOW[weekdayOf(d.k)]} ${dateOf(d.k).getDate()}${d.fut ? '' : ', ' + Math.round(d.frac * 100) + '% done'}`}
              onPress={() => !d.fut && !d.isToday && useUI.getState().openSheet({ k: 'day', date: d.k })}
              style={{ flex: 1, height: 58, borderWidth: 1, borderColor: d.isToday ? alpha(p.ac, 0.55) : 'transparent', borderRadius: 10, backgroundColor: d.isToday ? p.act : 'transparent', padding: 6, justifyContent: 'space-between', opacity: d.fut ? 0.4 : 1 }}
            >
              <Txt size={10} w={500} ls={0.1} color={p.lbl}>{DL[weekdayOf(d.k)]}</Txt>
              <Txt size={17} w={300} ls={-0.03} lh={1.1} tab color={d.isToday ? p.acx : p.tx}>{dateOf(d.k).getDate()}</Txt>
              <View style={{ height: 3, borderRadius: 99, backgroundColor: p.sf2 }}>
                {d.frac > 0 && <View style={{ height: 3, width: `${d.frac * 100}%`, borderRadius: 99, backgroundColor: p.ac, boxShadow: p.glow }} />}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Ring frac={tot ? dn / tot : 0}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }} accessibilityLabel={`${dn} of ${tot} done`}>
                <Txt size={32} w={300} ls={-0.05} lh={1.1} tab>{dn}</Txt>
                <Txt size={14} color={p.mu}>/{tot}</Txt>
              </View>
            </Ring>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={16} ls={-0.01} lh={1.3}>{headline}</Txt>
              <Txt size={12} color={p.mu}>{pend ? `Next up: ${pend.h.name} at ${pend.h.reminder}` : 'Nothing else scheduled — anytime works'}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {segs.map((v) => (
              <View key={v.h.id} style={{ flex: 1, height: 3, borderRadius: 99, overflow: 'hidden', backgroundColor: v.done ? p.ac : p.sf2, boxShadow: v.done ? p.glow : undefined, flexDirection: 'row' }}>
                {v.st === 'p' && <View style={{ width: '50%', backgroundColor: p.ac }} />}
              </View>
            ))}
          </View>
          {settings.xpOn && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="lightning" size={13} color={p.ac} />
              <Txt size={11.5} color={p.mu} numberOfLines={1}>Level {lvl} · {lvl * XP_PER_LEVEL - xp} XP to level {lvl + 1}</Txt>
            </View>
          )}
        </View>

        {rec && <RecoveryCard {...rec} />}

        {settings.todayLayout === 'List' ? (
          groups.map((g) => (
            <View key={g.title}>
              <Rule />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14, paddingHorizontal: 20, paddingBottom: 6 }}>
                <Label>{g.title}</Label>
                <Txt size={11.5} w={500} tab color={p.mu}>{g.items.filter((v) => v.done).length}/{g.items.length}</Txt>
              </View>
              {g.items.map((v) => (
                <HabitRow key={v.h.id} vm={v} fill={settings.rowControl === 'Fill row'} />
              ))}
            </View>
          ))
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16 }}>
              {vms.map((v) => (
                <HabitTile key={v.h.id} vm={v} />
              ))}
            </View>
            <Txt size={11.5} color={p.mu} style={{ paddingVertical: 10, paddingHorizontal: 20 }}>Tap a tile to log it · hold for more</Txt>
          </>
        )}

        {all.length > act.length && (
          <View>
            <Rule />
            <Txt size={12} color={p.mu} style={{ paddingVertical: 10, paddingHorizontal: 20 }}>
              {all.length - act.length} paused habit{all.length - act.length === 1 ? '' : 's'} hidden · resume from You → Habits
            </Txt>
          </View>
        )}

        <View style={{ marginTop: 10, marginHorizontal: 16 }}>
          <Rule />
          <Pressable accessibilityRole="button" onPress={() => router.push('/review')} style={{ height: 50, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            {({ pressed }) => (
              <>
                <View style={{ gap: 1 }}>
                  <Txt size={13} w={500} color={pressed ? p.acx : p.tx}>Review your day</Txt>
                  <Txt size={11.5} color={p.mu}>Two questions, about a minute. Optional.</Txt>
                </View>
                <Icon name="arrow-right" size={16.5} color={pressed ? p.acx : p.tx} />
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
      <Fab onPress={() => router.push('/habit/form')} />
    </View>
  );
}

function score(v: HabitVM) {
  return v.done ? 1 : v.st === 'p' ? 0.5 : 0;
}

/** "Missed yesterday" — framed as recovery, never as failure. */
function useRecovery(dismissed: boolean) {
  const today = useToday();
  const { act } = useHabitSets();
  const log = useData((s) => s.log);
  const recovery = useData((s) => s.settings.recovery);
  const opts = useStreakOpts();
  return useMemo(() => {
    if (dismissed) return null;
    const y = addDays(today, -1);
    const h = act.find((x) => x.createdAt < y && statusOn(x, log, y, today) === 'm');
    if (!h) return null;
    const s = streakOf(h, log, today, opts);
    const chainKeys = range(addDays(today, -9), today);
    const mom = recovery === 'Momentum';
    const coveredY = s.covered.includes(y);
    const chain: CellKind[] = chainKeys.map((k) => (!mom && s.covered.includes(k) ? 'g' : statusOn(h, log, k, today)));
    if (mom) {
      const m = momentumOf(h, log, today);
      const before = Math.round(rate([h], log, addDays(today, -31), addDays(today, -2), today) * 100);
      return { id: h.id, icon: 'lifebuoy', title: `Missed ${h.name} yesterday`, body: `Momentum moved from ${before}% to ${m}%. One day barely moves it — tonight counts just as much.`, chain, chainLbl: 'Last 10 days — one gap in a longer run' };
    }
    if (coveredY) {
      return { id: h.id, icon: 'shield-check', title: `${h.name}: streak kept`, body: `You missed yesterday, so a grace day stepped in. Your ${s.current}-day streak continues${s.graceLeft ? ` — ${s.graceLeft} grace day${s.graceLeft === 1 ? '' : 's'} left this week` : ' — that was this week’s grace day'}.`, chain, chainLbl: 'Last 10 days — striped = covered by grace day' };
    }
    return { id: h.id, icon: 'lifebuoy', title: `Missed ${h.name} yesterday`, body: `Your best of ${s.best} days still stands. If you did it, log it — otherwise today is a fresh start.`, chain, chainLbl: 'Last 10 days' };
  }, [dismissed, today, act, log, recovery, opts]);
}

function RecoveryCard({ id, icon, title, body, chain, chainLbl }: { id: string; icon: string; title: string; body: string; chain: CellKind[]; chainLbl: string }) {
  const { p } = useT();
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: p.ln2, borderRadius: 8, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', gap: 12, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 10 }}>
        <Icon name={icon} size={20} color={p.ac} style={{ marginTop: 1 }} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={13} w={500}>{title}</Txt>
          <Txt size={12} lh={1.45} color={p.mu}>{body}</Txt>
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 8 }}>
            {chain.map((c, i) => (
              <View key={i} style={{ flex: 1 }}>
                <Cell s={c} w={24} h={14} r={6} style={{ width: '100%' }} />
              </View>
            ))}
          </View>
          <Txt size={11} color={p.mu} style={{ marginTop: 2 }}>{chainLbl}</Txt>
        </View>
      </View>
      <Rule />
      <View style={{ flexDirection: 'row' }}>
        <Pressable accessibilityRole="button" onPress={() => logYesterday(id)} style={({ pressed }) => ({ flex: 1, height: 44, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: pressed ? p.act : 'transparent' })}>
          <Txt size={12} w={500} color={p.acx}>I did it — log yesterday</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={dismissRecovery} style={({ pressed }) => ({ width: 96, height: 44, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: pressed ? p.sf : 'transparent' })}>
          <Txt size={12} w={500}>Got it</Txt>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyToday() {
  const { p } = useT();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: ins.top + 36, paddingHorizontal: 24, gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 4 }} accessibilityElementsHidden>
        <View style={{ width: 28, height: 28, borderWidth: 1, borderColor: p.ln2, borderRadius: 8 }} />
        <View style={{ width: 28, height: 28, borderWidth: 1, borderStyle: 'dashed', borderColor: p.ln2, borderRadius: 8 }} />
        <View style={{ width: 28, height: 28, borderWidth: 1, borderStyle: 'dashed', borderColor: p.ln2, borderRadius: 8 }} />
      </View>
      <Txt size={24} w={500} ls={-0.025} lh={1.05} accessibilityRole="header">Start with one habit.</Txt>
      <Txt size={13} lh={1.5} color={p.mu}>Small and specific works best — “Read 5 pages” beats “Read more”. You can add the rest later.</Txt>
      <Btn variant="primary" label="Create a habit" icon="plus" height={46} size={13.5} onPress={() => router.push('/habit/form')} />
      <Btn label="Browse starter habits" icon="arrow-right" onPress={() => router.push({ pathname: '/welcome', params: { step: '1' } })} />
    </View>
  );
}
