import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { AppBar, Btn, Chip, Label, Note, Page, Rule, Seg, Stepper, SwitchRow, Txt } from '@/components/ui';
import { CATS, ICONS, TEMPLATES, TIMES, stepFor } from '@/domain/catalog';
import { DL } from '@/domain/dates';
import { fmtNum } from '@/domain/goals';
import type { HabitType } from '@/domain/types';
import { ensurePermission } from '@/services/notifications';
import { blankForm, formFor, saveForm, type HabitForm } from '@/store/actions';
import { useData } from '@/store/data';
import { useHabitSets } from '@/store/hooks';
import { useT } from '@/theme';
import { font } from '@/theme/tokens';

const TYPES: [HabitType, string, string, string][] = [
  ['bool', 'Yes / No', 'Done or not', 'check'],
  ['qty', 'Amount', 'Count to a target', 'hash'],
  ['dur', 'Timed', 'With a timer', 'timer'],
  ['avoid', 'Avoid', 'Stay away from it', 'shield-check'],
];

export default function HabitFormScreen() {
  const { p } = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; type?: HabitType }>();
  const existing = useData((s) => (params.id ? s.habits.find((h) => h.id === params.id) : undefined));
  const { all } = useHabitSets();
  const [f, setF] = useState<HabitForm>(() => (existing ? formFor(existing) : blankForm(params.type ?? 'bool')));
  const sf = (x: Partial<HabitForm>) => setF((cur) => ({ ...cur, ...x }));
  const stp = stepFor(f.target);
  const can = !!f.name.trim();

  const save = async () => {
    if (!can) return;
    if (f.rem) await ensurePermission();
    const id = saveForm(f);
    if (!id) return;
    if (f.mode === 'create') router.dismissTo('/');
    else router.back();
  };

  const stackOpts = [{ id: '', name: 'Nothing — standalone' }, ...all.filter((h) => h.id !== f.id).map((h) => ({ id: h.id, name: h.name }))];
  const stackName = all.find((h) => h.id === f.stack)?.name;

  return (
    <Page
      bar={
        <AppBar
          icon="x"
          title={f.mode === 'create' ? 'New habit' : 'Edit habit'}
          right={
            <Pressable accessibilityRole="button" disabled={!can} onPress={save} style={{ height: 48, paddingHorizontal: 16, justifyContent: 'center' }}>
              <Txt size={13.5} w={500} color={can ? p.acx : p.fa}>Save</Txt>
            </Pressable>
          }
        />
      }
      contentStyle={{ paddingBottom: 32 }}
    >
      <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 }}>
          <Icon name={f.icon} size={24} color={p.ac} />
          <TextInput
            value={f.name}
            onChangeText={(name) => sf({ name })}
            placeholder="Name your habit"
            placeholderTextColor={p.fa}
            accessibilityLabel="Habit name"
            autoFocus={f.mode === 'create'}
            style={{ flex: 1, minWidth: 0, color: p.tx, fontFamily: font.medium, fontSize: 24, letterSpacing: -0.6, paddingVertical: 6, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) } as never}
          />
        </View>
        {f.mode === 'create' && !f.name && (
          <View style={{ gap: 6 }}>
            <Txt size={11.5} color={p.mu}>Or start from one of these</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {TEMPLATES.map((t) => (
                <Chip key={t.name} label={t.name} icon={t.icon} height={36} onPress={() => sf({ name: t.name, icon: t.icon, type: t.type, target: t.target ?? 8, unit: t.unit ?? 'glasses', dur: t.dur ?? 10, time: t.time, cat: t.cat })} />
              ))}
            </View>
          </View>
        )}
        <View accessibilityRole="radiogroup" accessibilityLabel="Icon" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: p.ln, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden' }}>
          {ICONS.map((ic) => {
            const sel = f.icon === ic;
            return (
              <Pressable key={ic} accessibilityRole="radio" accessibilityLabel={ic} accessibilityState={{ selected: sel }} onPress={() => sf({ icon: ic })} style={{ flexBasis: '16%', flexGrow: 1, height: 44, borderWidth: 1, borderColor: sel ? p.ac : 'transparent', borderRadius: 8, overflow: 'hidden' }}>
                <LinearGradient colors={sel ? [p.act, p.act] : [p.cardTop, p.cardBottom]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={ic} size={16.5} color={sel ? p.acx : p.tx} />
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Rule />
      <View style={{ paddingVertical: 14, paddingHorizontal: 20, gap: 10 }}>
        <Label>How do you track it?</Label>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: p.ln, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden' }}>
          {TYPES.map(([k, l, d, ic]) => {
            const sel = f.type === k;
            return (
              <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: sel }} onPress={() => sf({ type: k })} style={{ flexBasis: '49%', flexGrow: 1, height: 74, borderWidth: 1, borderColor: sel ? p.ac : 'transparent', borderRadius: 10, overflow: 'hidden' }}>
                <LinearGradient colors={sel ? [p.act, p.act] : [p.cardTop, p.cardBottom]} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, justifyContent: 'space-between' }}>
                  <Icon name={ic} size={16.5} color={sel ? p.acx : p.tx} />
                  <View>
                    <Txt size={13} w={500} color={sel ? p.acx : p.tx}>{l}</Txt>
                    <Txt size={11} color={sel ? p.acx : p.mu}>{d}</Txt>
                  </View>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
        {f.type === 'qty' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Stepper value={fmtNum(f.target)} onMinus={() => sf({ target: Math.max(1, f.target - stp) })} onPlus={() => sf({ target: f.target + stp })} />
              <TextInput
                value={f.unit}
                onChangeText={(unit) => sf({ unit })}
                placeholder="unit"
                placeholderTextColor={p.fa}
                accessibilityLabel="Unit"
                style={{ flex: 1, minWidth: 0, height: 48, borderRadius: 8, backgroundColor: p.sf, color: p.tx, fontFamily: font.regular, fontSize: 13.5, paddingHorizontal: 12 }}
              />
            </View>
            <Txt size={11.5} color={p.mu}>Log it in steps from Today — partial progress still counts.</Txt>
          </>
        )}
        {f.type === 'dur' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Stepper value={f.dur + ' min'} minWidth={80} onMinus={() => sf({ dur: Math.max(5, f.dur - 5) })} onPlus={() => sf({ dur: f.dur + 5 })} />
            <Txt size={11.5} color={p.mu}>Start a timer from Today.</Txt>
          </View>
        )}
        {f.type === 'avoid' && <Txt size={12} lh={1.45} color={p.mu}>Each day counts as clean unless you log a slip. A slip starts a new count — your best stays on record.</Txt>}
      </View>

      <Rule />
      <View style={{ paddingVertical: 14, paddingHorizontal: 20, gap: 10 }}>
        <Label>How often</Label>
        <Seg options={['Every day', 'Weekdays', 'Pick days', 'Per week'] as const} value={f.sched} onChange={(sched) => sf({ sched })} height={40} size={11.5} />
        {f.sched === 'Pick days' && (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {f.days.map((on, k) => (
              <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][k]} onPress={() => { const d = [...f.days]; d[k] = !d[k]; sf({ days: d }); }} style={{ flex: 1, height: 44, borderWidth: 1.5, borderColor: on ? p.ac : p.ln2, borderRadius: 8, backgroundColor: on ? p.act : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={12} w={500} color={on ? p.acx : p.tx}>{DL[k]}</Txt>
              </Pressable>
            ))}
          </View>
        )}
        {f.sched === 'Per week' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Stepper value={f.perWeek + '× a week'} minWidth={84} height={44} size={13.5} onMinus={() => sf({ perWeek: Math.max(1, f.perWeek - 1) })} onPlus={() => sf({ perWeek: Math.min(7, f.perWeek + 1) })} />
            <Txt size={11.5} color={p.mu}>Any days you like.</Txt>
          </View>
        )}
        <Label style={{ marginTop: 4 }}>When</Label>
        <Seg options={TIMES} value={f.time} onChange={(time) => sf({ time })} height={40} size={11.5} />
      </View>

      <Rule />
      <View style={{ paddingVertical: 14, paddingHorizontal: 20, gap: 10 }}>
        <SwitchRow title="Reminder" sub="Notification with Done, Snooze and Skip" on={f.rem} onToggle={() => sf({ rem: !f.rem })} />
        {f.rem && <TimeField value={f.remTime} onChange={(remTime) => sf({ remTime })} />}
      </View>

      <Rule />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: f.more }} onPress={() => sf({ more: !f.more })} style={({ pressed }) => ({ height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: pressed ? p.sf : 'transparent' })}>
        <Txt size={13} w={500}>More options — category, stacking, grace days</Txt>
        <Icon name={f.more ? 'caret-up' : 'caret-down'} size={15} color={p.tx} />
      </Pressable>
      {f.more && (
        <View style={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 16, gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Txt size={11.5} color={p.mu}>Category</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {CATS.map((c) => <Chip key={c} label={c} sel={f.cat === c} height={32} onPress={() => sf({ cat: c })} />)}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Txt size={11.5} color={p.mu}>Habit stacking — do it right after</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {stackOpts.map((o) => <Chip key={o.id || 'none'} label={o.name} sel={f.stack === o.id} height={32} onPress={() => sf({ stack: o.id })} />)}
            </View>
            {stackName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: p.ln2, borderRadius: 14 }}>
                  <Txt size={12} w={500}>{stackName}</Txt>
                </View>
                <Icon name="arrow-right" size={13} color={p.ac} />
                <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: p.act }}>
                  <Txt size={12} w={500} color={p.acx}>{f.name || 'this habit'}</Txt>
                </View>
              </View>
            )}
          </View>
          <SwitchRow title="Grace days" sub="A missed day now and then won't break the streak" on={f.grace} onToggle={() => sf({ grace: !f.grace })} />
          <SwitchRow title="Smart reminder" sub="Moves toward the time you usually check in" on={f.smartRem} onToggle={() => sf({ smartRem: !f.smartRem })} />
        </View>
      )}

      {f.mode === 'edit' && (
        <View style={{ marginTop: 4, marginHorizontal: 20 }}>
          <Note icon="info">Changes apply from today. Past days keep the schedule they had, so your history stays accurate.</Note>
        </View>
      )}
      <View style={{ padding: 16, paddingHorizontal: 20 }}>
        <Btn variant="primary" label="Save habit" icon="check" height={46} size={13.5} disabled={!can} onPress={save} />
      </View>
    </Page>
  );
}

/** HH:MM with hour and minute steppers — no platform picker needed, works offline everywhere. */
function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { p } = useT();
  const [h, m] = value.split(':').map(Number);
  const set = (hh: number, mm: number) => onChange(String((hh + 24) % 24).padStart(2, '0') + ':' + String((mm + 60) % 60).padStart(2, '0'));
  return (
    <View accessibilityLabel={`Reminder time ${value}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 8, backgroundColor: p.sf, paddingHorizontal: 6 }}>
      <Stepper value={String(h).padStart(2, '0')} minWidth={36} height={40} onMinus={() => set(h - 1, m)} onPlus={() => set(h + 1, m)} />
      <Txt size={16.5} w={500}>:</Txt>
      <Stepper value={String(m).padStart(2, '0')} minWidth={36} height={40} onMinus={() => set(h, m % 5 ? m - (m % 5) : m - 5)} onPlus={() => set(h, m - (m % 5) + 5)} />
    </View>
  );
}
