import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { AppBar, Btn, Label, Legend, Page, Rule, Swatch, SwitchRow, Txt } from '@/components/ui';
import { bodyFor, ensurePermission, titleFor } from '@/services/notifications';
import { setSettings } from '@/store/actions';
import { getData, useData } from '@/store/data';
import { useT } from '@/theme';
import * as Notifications from 'expo-notifications';

export default function Reminders() {
  const { p } = useT();
  const s = useData((x) => x.settings);
  const habits = useData((x) => x.habits);
  const routines = useData((x) => x.routines);
  const [granted, setGranted] = useState<boolean | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') Notifications.getPermissionsAsync().then((r) => setGranted(r.granted));
  }, []);

  const times = new Set<number>();
  for (const h of habits) if (!h.archived && !h.paused && h.reminder) times.add(Number(h.reminder.slice(0, 2)));
  if (s.routineReminders) for (const r of routines) times.add(Number(r.time.slice(0, 2)));
  if (s.morningSummary) times.add(8);
  if (s.eveningCatchUp) times.add(20);
  const quiet = (k: number) => s.quietHours && (k >= 22 || k < 7);
  const live = habits.filter((h) => !h.archived && !h.paused && h.reminder);
  const first = live.find((h) => h.stackAfter) ?? live[0];

  const rows: [keyof typeof s, string, string][] = [
    ['remindersOn', 'Reminders', 'Master switch for all habits'],
    ['quietHours', 'Quiet hours · 22:00–07:00', 'Nothing buzzes while you sleep'],
    ['smartTiming', 'Smart timing', 'Shifts toward when you usually check in'],
    ['routineReminders', 'Routine start', 'One nudge per routine, not per step'],
    ['eveningCatchUp', 'Evening catch-up', 'A single 20:00 note if habits are still open'],
    ['morningSummary', 'Morning summary', 'A single note at 08:00 with your day'],
  ];

  return (
    <Page bar={<AppBar title="Reminders" />}>
      <View style={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}>
        <Label>Your day</Label>
        <View style={{ flexDirection: 'row', gap: 1 }} accessibilityLabel={`Reminders at ${[...times].sort((a, b) => a - b).map((h) => h + ':00').join(', ') || 'no set times'}`}>
          {Array.from({ length: 24 }, (_, k) => (
            <View key={k} style={{ flex: 1, height: 28, borderRadius: 8, backgroundColor: quiet(k) ? p.bar : s.remindersOn && times.has(k) ? p.ac : p.sf2 }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {['00', '06', '12', '18', '24'].map((t) => <Txt key={t} size={10} w={500} color={p.mu}>{t}</Txt>)}
        </View>
        <Legend items={[{ label: 'Quiet', swatch: <Swatch color={p.bar} /> }, { label: 'Reminders', swatch: <Swatch color={p.ac} /> }]} />
      </View>

      {granted === false && s.remindersOn && (
        <View style={{ marginHorizontal: 20, marginVertical: 8, padding: 14, borderWidth: 1, borderColor: p.ln2, borderRadius: 8, gap: 10 }}>
          <Txt size={12.5} lh={1.5}>Notifications are off for HabitFlow, so reminders can’t appear yet.</Txt>
          <Btn label="Allow notifications" icon="bell" onPress={async () => { const ok = await ensurePermission(); setGranted(ok); if (!ok) Linking.openSettings(); }} />
        </View>
      )}

      <Rule style={{ marginTop: 8 }} />
      {rows.map(([k, t, sub]) => (
        <SwitchRow key={k} title={t} sub={sub} on={!!s[k]} onToggle={async () => { if (!s[k]) await ensurePermission(); setSettings({ [k]: !s[k] }); }} style={{ paddingVertical: 12, paddingHorizontal: 20 }} />
      ))}

      <View style={{ padding: 16, paddingHorizontal: 20, gap: 8 }}>
        <Label>Preview</Label>
        <View style={{ backgroundColor: p.sf, borderRadius: 14, overflow: 'hidden' }}>
          <View style={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 10, gap: 2 }}>
            <Txt size={11} color={p.mu}>HabitFlow · {first?.reminder ?? '07:15'}</Txt>
            <Txt size={13} w={500}>{first ? titleFor(first) : 'Your habit'}</Txt>
            <Txt size={12} color={p.mu}>{first ? bodyFor(first, getData()) : 'Add a reminder time to a habit to see it here.'}</Txt>
          </View>
          <Rule />
          <View style={{ flexDirection: 'row' }}>
            {['DONE', 'SNOOZE 15M', 'SKIP'].map((a, i) => (
              <Txt key={a} size={11.5} w={500} color={i === 0 ? p.acx : p.tx} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 14 }}>{a}</Txt>
            ))}
          </View>
        </View>
        <Txt size={11} lh={1.5} color={p.mu}>Done, Snooze and Skip work straight from the notification — no need to open the app.</Txt>
      </View>
    </Page>
  );
}
