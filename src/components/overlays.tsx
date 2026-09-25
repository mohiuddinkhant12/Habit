import { useRouter, usePathname } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { XP_MILESTONE_BONUS } from '@/domain/catalog';
import { fmtNum, short } from '@/domain/goals';
import { DOW, shortD, weekdayOf, addDays } from '@/domain/dates';
import { dayStat, statusOn } from '@/domain/status';
import { restore as doRestore, listBackups, pickFile, readBackup, share, type BackupFile } from '@/services/backup';
import { eraseThisPhone, removeCloudCopy, signOutGoogle } from '@/services/account';
import { archive, deleteHabit, increment, setNote, skip, togglePause, undo } from '@/store/actions';
import { useData } from '@/store/data';
import { useHabitSets, useStreakOpts, useToday } from '@/store/hooks';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';
import { alpha, mix } from '@/theme/color';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useAnim } from './anim';
import { Cell } from './charts';
import { habitVM, valFor } from './habitVM';
import { Icon } from './Icon';
import { Bar, Btn, IconBtn, Rule, Txt } from './ui';

const TAB_ROOTS = ['/', '/routines', '/insights', '/you'];

export function Snackbar() {
  const { p, t2 } = useT();
  const snack = useUI((s) => s.snack);
  const path = usePathname();
  const ins = useSafeAreaInsets();
  const y = useAnim(60);
  useEffect(() => {
    if (snack) {
      y.setValue(t2 ? 60 : 0);
      Animated.timing(y, { toValue: 0, duration: t2, useNativeDriver: true }).start();
    }
  }, [snack, t2, y]);
  if (!snack) return null;
  const bottom = (TAB_ROOTS.includes(path) ? 84 : 16) + ins.bottom;
  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 12, right: 12, bottom, zIndex: 20, transform: [{ translateY: y }], backgroundColor: p.toast, borderWidth: 1, borderColor: p.ln2, borderRadius: 8, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 4, boxShadow: p.shadowMd }}
    >
      <Txt size={12.5} lh={1.35} style={{ flex: 1, paddingVertical: 10 }}>{snack.msg}</Txt>
      {snack.undo && (
        <Pressable accessibilityRole="button" onPress={() => undo(snack.undo!)} style={{ height: 44, paddingHorizontal: 14, justifyContent: 'center' }}>
          <Txt size={12.5} w={500} color={p.acx}>Undo</Txt>
        </Pressable>
      )}
    </Animated.View>
  );
}

/** Bottom-sheet frame: scrim fades, sheet slides up. */
function SheetFrame({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const { p, t2 } = useT();
  const ins = useSafeAreaInsets();
  const a = useAnim(0);
  useEffect(() => {
    if (open) {
      a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: t2, useNativeDriver: true }).start();
    }
  }, [open, a, t2]);
  return (
    <Modal visible={open} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: p.scrim, opacity: a }}>
          <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={{
            maxHeight: '78%',
            backgroundColor: p.sf,
            borderTopLeftRadius: 14,
            borderTopRightRadius: 24,
            paddingBottom: 22 + ins.bottom,
            boxShadow: '0px -8px 30px rgba(0, 0, 0, 0.12)',
            transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
            opacity: t2 ? a.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }) : 1,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: p.fa }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetHost() {
  const s = useUI((x) => x.sheet);
  const close = () => useUI.getState().openSheet(null);
  return (
    <SheetFrame open={!!s} onClose={close}>
      {s?.k === 'actions' && <ActionsSheet id={s.id} />}
      {s?.k === 'day' && <DaySheet date={s.date} />}
      {s?.k === 'note' && <NoteSheet id={s.id} date={s.date} />}
      {s?.k === 'exported' && <ExportedSheet file={s.file} size={s.size} uri={s.uri} />}
      {s?.k === 'restore' && <RestoreSheet />}
      {s?.k === 'restoreErr' && <RestoreErrSheet reason={s.reason} />}
    </SheetFrame>
  );
}

function ActionsSheet({ id }: { id: string }) {
  const { p } = useT();
  const router = useRouter();
  const today = useToday();
  const opts = useStreakOpts();
  const h = useData((s) => s.habits.find((x) => x.id === id));
  const log = useData((s) => s.log);
  const settings = useData((s) => s.settings);
  if (!h) return null;
  const vm = habitVM(h, log, today, settings, opts);
  const go = (fn: () => void) => () => fn();
  const items: [string, string, () => void, string?][] = [
    ['Add a note', 'note', () => useUI.getState().openSheet({ k: 'note', id, date: today })],
    ['Skip today', 'skip-forward', () => skip(id)],
    ['Edit habit', 'pencil-simple', () => { useUI.getState().openSheet(null); router.push({ pathname: '/habit/form', params: { id } }); }],
    [h.paused ? 'Resume' : 'Pause (vacation)', 'pause', () => togglePause(id)],
    ['Archive', 'archive', () => useUI.getState().openDialog({ k: 'archive', id })],
    ['Delete', 'trash', () => useUI.getState().openDialog({ k: 'delete', id }), p.acx],
  ];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 }}>
        <Icon name={h.icon} size={24} color={p.ac} />
        <View style={{ flex: 1 }}>
          <Txt size={19} w={500}>{h.name}</Txt>
          <Txt size={11.5} color={p.mu}>{vm.meta}</Txt>
        </View>
      </View>
      {h.type === 'qty' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: p.ln2, borderRadius: 8, overflow: 'hidden', height: 52 }}>
          <IconBtn icon="minus" label="Decrease" size={16.5} onPress={() => increment(id, -1)} style={{ width: 56, borderRadius: 0 }} />
          <Txt size={14.5} w={500} tab style={{ flex: 1 }}>{short(vm.value) + ' / ' + short(h.target) + ' ' + h.unit}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Increase" onPress={() => increment(id, 1)} style={{ width: 56, height: 48, borderWidth: 1, borderColor: p.ac, borderRadius: 8, backgroundColor: alpha(p.ac, 0.1), alignItems: 'center', justifyContent: 'center', marginRight: 1 }}>
            <Icon name="plus" size={16.5} color={p.acx} />
          </Pressable>
        </View>
      )}
      <Rule />
      {items.map(([l, ic, fn, c]) => (
        <Pressable key={l} accessibilityRole="button" onPress={go(fn)} style={({ pressed }) => ({ height: 52, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, backgroundColor: pressed ? p.sf2 : 'transparent' })}>
          <Icon name={ic} size={19} color={c ?? p.tx} />
          <Txt size={13.5} w={500} color={c ?? p.tx}>{l}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

function DaySheet({ date }: { date: string }) {
  const { p } = useT();
  const today = useToday();
  const { act } = useHabitSets();
  const log = useData((s) => s.log);
  const st = dayStat(act, log, date, today);
  const r = st.due ? st.done / st.due : 0;
  const title = date === addDays(today, -1) ? 'Yesterday, ' + shortD(date) : date === today ? 'Today, ' + shortD(date) : DOW[weekdayOf(date)] + ', ' + shortD(date);
  return (
    <View>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Txt size={20} w={500}>{title}</Txt>
          <Txt size={22} w={500} tab>{Math.round(r * 100) + '%'}</Txt>
        </View>
        <Bar v={r} height={8} />
      </View>
      {act.map((h) => {
        const s = statusOn(h, log, date, today);
        return (
          <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 20 }}>
            <Cell s={s} size={16} />
            <Icon name={h.icon} size={14.5} color={p.mu} />
            <Txt size={13} style={{ flex: 1 }}>{h.name}</Txt>
            <Txt size={12} color={p.mu}>{s === 'o' ? 'Not scheduled' : valFor(h, s, log[h.id]?.[date]?.v)}</Txt>
          </View>
        );
      })}
    </View>
  );
}

function NoteSheet({ id, date }: { id: string; date: string }) {
  const { p } = useT();
  const today = useToday();
  const h = useData((s) => s.habits.find((x) => x.id === id));
  const existing = useData((s) => s.log[id]?.[date]?.note ?? '');
  const [text, setText] = useState(existing);
  const save = () => {
    const t = text.trim();
    useUI.getState().openSheet(null);
    if (t !== existing) {
      setNote(id, date, t);
      if (t) useUI.getState().toast('Note saved to ' + (date === today ? 'today' : shortD(date)));
    }
  };
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 14, gap: 12 }}>
      <Txt size={19} w={500}>Note for {h?.name}</Txt>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={3}
        placeholder="How did it go? Anything worth remembering?"
        placeholderTextColor={p.fa}
        accessibilityLabel="Note"
        style={{ minHeight: 76, borderRadius: 8, backgroundColor: p.bg, color: p.tx, fontFamily: 'Inter_400Regular', fontSize: 13, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' }}
      />
      <Btn variant="primary" label="Save note" icon="check" height={46} size={13.5} onPress={save} />
    </View>
  );
}

function ExportedSheet({ file, size, uri }: { file: string; size: string; uri: string }) {
  const { p } = useT();
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 14, gap: 12 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.ac, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={24} color={p.onac} />
      </View>
      <Txt size={22} w={500}>Export saved</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: p.ln2, borderRadius: 8 }}>
        <Icon name={file.endsWith('.csv') ? 'file-code' : file.endsWith('.hfbak') ? 'file-zip' : 'file-code'} size={20} color={p.tx} />
        <View style={{ flex: 1 }}>
          <Txt size={12.5} w={500}>{file}</Txt>
          <Txt size={11} color={p.mu}>{size} · {Platform.OS === 'web' ? 'Downloads' : 'HabitFlow documents'}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Platform.OS !== 'web' && <Btn label="Share" icon="share-network" style={{ flex: 1, paddingHorizontal: 14 }} onPress={() => share(uri)} />}
        <Btn variant="primary" label="Done" icon="check" style={{ flex: 1, paddingHorizontal: 14 }} onPress={() => useUI.getState().openSheet(null)} />
      </View>
    </View>
  );
}

function RestoreSheet() {
  const { p } = useT();
  const [files] = useState<BackupFile[]>(() => listBackups());
  const choose = async (f: BackupFile) => {
    const check = await readBackup(f.uri);
    if (check.ok) useUI.getState().openDialog({ k: 'restore', file: f.name, uri: f.uri });
    else useUI.getState().openSheet({ k: 'restoreErr', reason: check.reason });
  };
  const pick = async () => {
    const f = await pickFile();
    if (f) choose(f);
  };
  return (
    <View>
      <Txt size={19} w={500} style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>Choose a backup</Txt>
      {files.map((f) => (
        <Pressable key={f.uri} accessibilityRole="button" onPress={() => choose(f)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: pressed ? p.sf2 : 'transparent' })}>
          <Icon name="file-zip" size={20} color={p.tx} />
          <View style={{ flex: 1 }}>
            <Txt size={12.5} w={500}>{f.name}</Txt>
            <Txt size={11} color={p.mu}>{f.sub}</Txt>
          </View>
        </Pressable>
      ))}
      {!files.length && <Txt size={12.5} color={p.mu} lh={1.5} style={{ paddingHorizontal: 20, paddingVertical: 8 }}>No backups on this device yet. Pick a file you saved elsewhere.</Txt>}
      {Platform.OS !== 'web' && (
        <Pressable accessibilityRole="button" onPress={pick} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: pressed ? p.sf2 : 'transparent' })}>
          <Icon name="upload-simple" size={20} color={p.tx} />
          <Txt size={12.5} w={500}>Choose a file…</Txt>
        </Pressable>
      )}
    </View>
  );
}

function RestoreErrSheet({ reason }: { reason: string }) {
  const { p } = useT();
  const newer = reason === 'newer';
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 14, gap: 10 }}>
      <View style={{ width: 48, height: 48, borderWidth: 1, borderColor: p.ln2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="warning" size={22} color={p.tx} />
      </View>
      <Txt size={22} w={500} lh={1.1}>{newer ? 'This backup is from a newer version.' : 'This file isn’t a HabitFlow backup.'}</Txt>
      <Txt size={12.5} lh={1.5} color={p.mu}>{newer ? 'Update HabitFlow to restore it. Nothing was changed — your current data is exactly as it was.' : 'It may be damaged or from another app. Nothing was changed — your current data is exactly as it was.'}</Txt>
      <Btn label="OK" icon="check" onPress={() => useUI.getState().openSheet(null)} />
    </View>
  );
}

export function DialogHost() {
  const { p, t2 } = useT();
  const dialog = useUI((s) => s.dialog);
  const habits = useData((s) => s.habits);
  const log = useData((s) => s.log);
  const today = useToday();
  const d = dialog;
  const close = () => useUI.getState().openDialog(null);
  let title = '';
  let body = '';
  let cta = '';
  let go = () => {};
  let alt: { label: string; go: () => void } | null = null;
  if (d?.k === 'signout') {
    title = 'Sign out of Google?';
    body = 'Everything stays on this phone and keeps working offline. Your Drive copy stays too — sign in again any time to pick up where you left off.';
    cta = 'Sign out';
    go = () => signOutGoogle();
    alt = { label: 'Sign out and remove HabitFlow’s access', go: () => signOutGoogle(true) };
  } else if (d?.k === 'deleteCloud') {
    title = 'Delete the Drive copy?';
    body = 'This removes HabitFlow’s file from your Google Drive. Everything on this phone stays exactly as it is.';
    cta = 'Delete copy';
    go = () => removeCloudCopy();
  } else if (d?.k === 'erase') {
    title = 'Erase everything on this phone?';
    body = 'All habits, history, notes and your profile are removed from this phone and you’re signed out. A Drive copy, if you have one, is kept — sign in again to bring it back.';
    cta = 'Erase';
    go = () => eraseThisPhone();
  } else if (d && d.k !== 'restore') {
    const h = habits.find((x) => x.id === d.id);
    if (h) {
      const n = Object.keys(log[h.id] ?? {}).filter((k) => statusOn(h, log, k, today) === 'd').length;
      if (d.k === 'archive') {
        title = `Archive ${h.name}?`;
        body = `It leaves Today and stops reminding you. All ${fmtNum(n)} check-ins are kept, and you can restore it any time.`;
        cta = 'Archive';
        go = () => archive(h.id);
      } else {
        title = `Delete ${h.name} for good?`;
        body = 'This removes the habit and its history from this device. Archiving keeps the history instead.';
        cta = 'Delete';
        go = () => deleteHabit(h.id);
        if (!h.archived) alt = { label: 'Archive instead', go: () => archive(h.id) };
      }
    }
  } else if (d?.k === 'restore') {
    title = 'Restore this backup?';
    body = `Your current data is backed up first, then replaced with ${d.file}. Nothing is lost.`;
    cta = 'Restore';
    go = async () => {
      close();
      const r = await doRestore(d.uri);
      if (r.ok) useUI.getState().toast('Restored — current data saved as a backup first');
      else useUI.getState().openSheet({ k: 'restoreErr', reason: r.reason });
    };
  }
  return (
    <Modal visible={!!dialog} transparent animationType={t2 ? 'fade' : 'none'} statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: alpha('#0d0c0c', 0.5), justifyContent: 'center', padding: 24 }}>
        <View accessibilityRole="alert" style={{ backgroundColor: p.bg, borderWidth: 1, borderColor: p.ln, borderRadius: 14, overflow: 'hidden', boxShadow: p.shadowLg }}>
          <View style={{ padding: 20, paddingBottom: 16, gap: 8 }}>
            <Txt size={20} w={500} lh={1.15}>{title}</Txt>
            <Txt size={12.5} lh={1.5} color={p.mu}>{body}</Txt>
          </View>
          {alt && (
            <>
              <Rule />
              <Pressable accessibilityRole="button" onPress={alt.go} style={{ height: 48, justifyContent: 'center', paddingHorizontal: 20 }}>
                <Txt size={13} w={500}>{alt.label}</Txt>
              </Pressable>
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Pressable accessibilityRole="button" onPress={close} style={{ flex: 1, height: 52, justifyContent: 'center', paddingHorizontal: 20 }}>
              <Txt size={13} w={500}>Cancel</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={go} style={{ flex: 1, height: 52, justifyContent: 'center', paddingHorizontal: 20, borderWidth: 1, borderColor: p.ac, borderRadius: 8, backgroundColor: alpha(p.ac, 0.1) }}>
              <Txt size={13} w={500} color={p.acx}>{cta}</Txt>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function MilestoneOverlay() {
  const { p, t2 } = useT();
  const ms = useUI((s) => s.milestone);
  const ins = useSafeAreaInsets();
  const close = () => useUI.getState().showMilestone(null);
  if (!ms) return null;
  const cells = Math.min(30, ms.n);
  return (
    <Modal visible transparent animationType={t2 ? 'fade' : 'none'} statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <Glow />
        <View style={{ flex: 1, paddingTop: 48 + ins.top, paddingHorizontal: 24, paddingBottom: 32 + ins.bottom, gap: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: cells }, (_, i) => (
              <View key={i} style={{ width: '8.6%', aspectRatio: 1, borderRadius: 3, backgroundColor: p.ac, boxShadow: p.glowSoft }} />
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Txt size={131} w={300} ls={-0.05} lh={0.8} tab>{ms.n}</Txt>
          <Txt size={24} w={500} ls={-0.025} lh={1.05}>days of {ms.name}.</Txt>
          <Txt size={13.5} lh={1.5}>{ms.longest ? 'Your longest run yet. ' : ''}Streaks are a record, not a rule — keep going at your own pace.</Txt>
          {ms.unlocked && <Txt size={13} w={500}>{ms.xp ? `+${XP_MILESTONE_BONUS} XP · ` : ''}Achievement unlocked: {ms.unlocked}</Txt>}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Btn label="Continue" icon="arrow-right" variant="primary" height={46} style={{ flex: 1, paddingHorizontal: 14 }} onPress={close} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** The accent glow rising from the bottom-left corner (splash and milestone). */
export function Glow() {
  const { p } = useT();
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} width="100%" height="100%">
      <Defs>
        <RadialGradient id="hfGlow" cx="0" cy="1" rx="1.2" ry="0.7" fx="0" fy="1" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor={mix(p.ac, p.bg, 0.34)} />
          <Stop offset="0.7" stopColor={p.bg} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#hfGlow)" />
    </Svg>
  );
}
