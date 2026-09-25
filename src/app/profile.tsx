import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { AppBar, Btn, Chip, Label, Note, Page, Rule, Row, SwitchRow, Txt } from '@/components/ui';
import { XP_PER_LEVEL } from '@/domain/catalog';
import { dateOf, MON } from '@/domain/dates';
import { fmtNum } from '@/domain/goals';
import type { Gender } from '@/domain/types';
import { connectGoogle, runSync, setProfile } from '@/services/account';
import { googleAvailable } from '@/services/google';
import { useData } from '@/store/data';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';
import { font } from '@/theme/tokens';

const GENDERS: Gender[] = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'];

export default function ProfileScreen() {
  const { p } = useT();
  const profile = useData((s) => s.profile);
  const sync = useData((s) => s.sync);
  const habits = useData((s) => s.habits);
  const log = useData((s) => s.log);
  const xp = useData((s) => s.xp);
  const xpOn = useData((s) => s.settings.xpOn);
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age ? String(profile.age) : '');
  const [busy, setBusy] = useState<'signin' | 'sync' | null>(null);

  const since = habits.reduce<string | null>((a, h) => (!a || h.createdAt < a ? h.createdAt : a), null);
  const checkins = Object.values(log).reduce((a, days) => a + Object.values(days).filter((e) => e.v > 0 && !e.skip).length, 0);
  const saveName = () => name.trim() !== profile.name && setProfile({ name: name.trim() });
  const saveAge = () => {
    const n = Number(age);
    const v = age.trim() && Number.isFinite(n) && n > 0 && n < 130 ? Math.round(n) : null;
    if (v !== profile.age) setProfile({ age: v });
    setAge(v ? String(v) : '');
  };
  const run = async (k: 'signin' | 'sync', fn: () => Promise<void>) => {
    setBusy(k);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };
  const last = sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'not yet';
  const field = { height: 48, borderRadius: 8, backgroundColor: p.sf, color: p.tx, fontFamily: font.regular, fontSize: 14, paddingHorizontal: 12 } as const;

  return (
    <Page bar={<AppBar title="Profile" />}>
      <View style={{ paddingTop: 8, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={22} w={500} ls={-0.025} numberOfLines={1}>{profile.name || 'You'}</Txt>
          <Txt size={12} color={p.mu} numberOfLines={1}>{profile.email ?? 'No account · this phone only'}</Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 1, backgroundColor: p.ln, marginHorizontal: 16, borderWidth: 1, borderColor: p.ln, borderRadius: 8, overflow: 'hidden' }}>
        {[
          ['Since', since ? `${MON[dateOf(since).getMonth()]} ${dateOf(since).getFullYear()}` : '—'],
          ['Check-ins', fmtNum(checkins)],
          ...(xpOn ? [['Level', String(Math.floor(xp / XP_PER_LEVEL) + 1)]] : [['Habits', String(habits.filter((h) => !h.archived).length)]]),
        ].map(([l, v]) => (
          <View key={l} style={{ flex: 1, backgroundColor: p.sf, paddingVertical: 12, paddingHorizontal: 14, gap: 4 }}>
            <Label>{l}</Label>
            <Txt size={18} w={500} tab>{v}</Txt>
          </View>
        ))}
      </View>

      <View style={{ padding: 16, paddingHorizontal: 20, gap: 14 }}>
        <Label>About you</Label>
        <View style={{ gap: 6 }}>
          <Txt size={11.5} color={p.mu}>Name</Txt>
          <TextInput value={name} onChangeText={setName} onEndEditing={saveName} onBlur={saveName} placeholder="What should we call you?" placeholderTextColor={p.fa} accessibilityLabel="Name" autoCapitalize="words" style={field} />
        </View>
        <View style={{ gap: 6 }}>
          <Txt size={11.5} color={p.mu}>Age</Txt>
          <TextInput value={age} onChangeText={(t) => setAge(t.replace(/[^0-9]/g, '').slice(0, 3))} onEndEditing={saveAge} onBlur={saveAge} placeholder="Optional" placeholderTextColor={p.fa} accessibilityLabel="Age" keyboardType="number-pad" style={[field, { width: 120 }]} />
        </View>
        <View style={{ gap: 6 }}>
          <Txt size={11.5} color={p.mu}>Gender</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {GENDERS.map((g) => (
              <Chip key={g} label={g} sel={profile.gender === g} onPress={() => setProfile({ gender: profile.gender === g ? null : g })} />
            ))}
          </View>
        </View>
        <Txt size={11.5} lh={1.5} color={p.mu}>All optional. Stored on this phone{profile.email ? ' and in your Drive copy' : ''} — never shared.</Txt>
      </View>

      <Rule />
      <View style={{ padding: 16, paddingHorizontal: 20, gap: 12 }}>
        <Label>Google Drive sync</Label>
        {!profile.email ? (
          <>
            <Txt size={13} lh={1.5}>Sign in with Google to keep a copy of your progress in your own Google Drive — handy for a new phone or a reinstall.</Txt>
            <Txt size={11.5} lh={1.5} color={p.mu}>Used only to save your progress. HabitFlow gets a private app folder in your Drive and can’t see your other files, email or contacts. The app keeps working fully offline either way.</Txt>
            {googleAvailable ? (
              <Pressable
                accessibilityRole="button"
                disabled={!!busy}
                onPress={() => run('signin', connectGoogle)}
                style={({ pressed }) => ({ height: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: p.ac, backgroundColor: pressed ? p.act : 'transparent' })}
              >
                {busy === 'signin' ? <ActivityIndicator color={p.acx} /> : <Txt size={16} w={600} color={p.acx}>G</Txt>}
                <Txt size={13.5} w={500} color={p.acx} style={{ flex: 1 }}>Sign in with Google</Txt>
                <Icon name="arrow-right" size={16} color={p.acx} />
              </Pressable>
            ) : (
              <Note icon="device-mobile">Google sign-in works in the Android app.</Note>
            )}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name={sync.lastError ? 'warning' : 'check'} size={16} color={sync.lastError ? p.tx : p.ac} />
              <View style={{ flex: 1 }}>
                <Txt size={13} w={500}>{sync.lastError ? 'Last sync didn’t finish' : 'Your progress is backed up'}</Txt>
                <Txt size={11.5} color={p.mu}>{sync.lastError ?? `Last synced: ${last}`}</Txt>
              </View>
            </View>
            <Btn variant="primary" label={busy === 'sync' ? 'Syncing…' : 'Sync now'} icon="arrow-counter-clockwise" disabled={!!busy} onPress={() => run('sync', runSync)} />
            <SwitchRow title="Sync automatically" sub="When you open or leave the app, and shortly after changes" on={sync.autoSync} onToggle={() => useData.getState().commit('sync-auto', null, (d) => ({ sync: { ...d.sync, autoSync: !d.sync.autoSync } }))} />
          </>
        )}
      </View>

      <Rule />
      <View style={{ paddingTop: 6 }}>
        {profile.email && <Row icon="arrow-left" title="Sign out" sub={profile.email} onPress={() => useUI.getState().openDialog({ k: 'signout' })} />}
        {profile.email && <Row icon="cloud-slash" title="Delete Drive copy" sub="Keeps everything on this phone" onPress={() => useUI.getState().openDialog({ k: 'deleteCloud' })} />}
        <Row icon="trash" title="Erase this phone" sub="Remove all habits, history and profile from this device" onPress={() => useUI.getState().openDialog({ k: 'erase' })} />
      </View>
    </Page>
  );
}
