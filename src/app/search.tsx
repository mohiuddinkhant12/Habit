import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Chip, IconBtn, Page, Txt } from '@/components/ui';
import { longD, shortD } from '@/domain/dates';
import { goalView } from '@/domain/goals';
import { currentSchedule, scheduleLabel } from '@/domain/status';
import { useData } from '@/store/data';
import { useToday } from '@/store/hooks';
import { useT } from '@/theme';
import { font } from '@/theme/tokens';

const KINDS = ['All', 'Habits', 'Routines', 'Goals', 'Notes'] as const;
type Kind = (typeof KINDS)[number];

interface Result {
  kind: Exclude<Kind, 'All'>;
  t: string;
  s: string;
  ic: string;
  to: Href;
  hay: string;
}

export default function Search() {
  const { p } = useT();
  const router = useRouter();
  const today = useToday();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>('All');
  const habits = useData((s) => s.habits);
  const routines = useData((s) => s.routines);
  const goals = useData((s) => s.goals);
  const log = useData((s) => s.log);
  const reviews = useData((s) => s.reviews);

  const all = useMemo(() => {
    const res: Result[] = [];
    for (const h of habits) res.push({ kind: 'Habits', t: h.name, s: h.archived ? 'Archived · ' + h.cat : h.cat + ' · ' + scheduleLabel(currentSchedule(h)), ic: h.icon, to: `/habit/${h.id}`, hay: '' });
    for (const r of routines) res.push({ kind: 'Routines', t: r.name + ' routine', s: r.steps.length + ' steps · ' + r.time, ic: 'repeat', to: `/routine/${r.id}`, hay: '' });
    for (const g of goals) {
      const v = goalView(g, habits.find((h) => h.id === g.habitId), log, today);
      res.push({ kind: 'Goals', t: g.name, s: Math.round(v.frac * 100) + '% · expected ' + v.eta, ic: 'target', to: `/goal/${g.id}`, hay: '' });
    }
    for (const h of habits) {
      for (const [k, e] of Object.entries(log[h.id] ?? {})) {
        if (e.note) res.push({ kind: 'Notes', t: e.note, s: h.name + ' · ' + longD(k, today), ic: 'note', to: `/habit/${h.id}`, hay: shortD(k) + ' ' + k });
      }
    }
    for (const [k, r] of Object.entries(reviews)) {
      const text = [r.helped, r.blocked].filter(Boolean).join(' · ');
      if (text) res.push({ kind: 'Notes', t: text, s: 'Daily review · ' + longD(k, today), ic: 'notebook', to: '/review', hay: shortD(k) + ' ' + k });
    }
    return res;
  }, [habits, routines, goals, log, reviews, today]);

  const needle = q.trim().toLowerCase();
  const out = all.filter((r) => (kind === 'All' || r.kind === kind) && (!needle || `${r.t} ${r.s} ${r.hay}`.toLowerCase().includes(needle))).slice(0, 30);

  return (
    <Page
      stickyHeaderIndices={[0]}
      bar={
        <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, backgroundColor: p.bg }}>
          <IconBtn icon="arrow-left" label="Back" size={20} onPress={() => router.back()} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Search habits, notes, dates"
            placeholderTextColor={p.fa}
            accessibilityLabel="Search"
            returnKeyType="search"
            style={{ flex: 1, minWidth: 0, color: p.tx, fontFamily: font.regular, fontSize: 15.5, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) } as never}
          />
          {q ? <IconBtn icon="x" label="Clear" size={16.5} color={p.mu} onPress={() => setQ('')} /> : null}
        </View>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20, paddingVertical: 12 }} style={{ backgroundColor: p.bg }}>
        {KINDS.map((k) => <Chip key={k} label={k} sel={kind === k} onPress={() => setKind(k)} />)}
      </ScrollView>
      {out.map((r, i) => (
        <Pressable key={r.kind + i} accessibilityRole="button" onPress={() => router.push(r.to)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: pressed ? p.sf : 'transparent' })}>
          <Icon name={r.ic} size={16.5} color={p.tx} style={{ width: 20 }} />
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Txt size={13.5} w={500} numberOfLines={1}>{r.t}</Txt>
            <Txt size={11} color={p.mu} numberOfLines={1}>{r.s}</Txt>
          </View>
          <Txt size={10.5} w={500} ls={0.06} upper color={p.mu}>{r.kind}</Txt>
        </Pressable>
      ))}
      {!out.length && (
        <Txt size={13} lh={1.5} color={p.mu} style={{ paddingVertical: 28, paddingHorizontal: 20 }}>
          {needle ? `Nothing matches “${q.trim()}”. Try a habit name, a note, or a date like “${shortD(today)}”.` : 'Nothing here yet.'}
        </Txt>
      )}
    </Page>
  );
}
