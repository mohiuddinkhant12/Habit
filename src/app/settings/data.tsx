import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Segments } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { AppBar, Btn, Label, Legend, Page, Rule, Seg, Swatch, Switch, Txt } from '@/components/ui';
import { fmtNum } from '@/domain/goals';
import { backupNow, exportData } from '@/services/backup';
import { setSettings } from '@/store/actions';
import { useData } from '@/store/data';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';

export default function DataScreen() {
  const { p } = useT();
  const d = useData();
  const s = d.settings;
  const [busy, setBusy] = useState(false);

  const checkins = Object.values(d.log).reduce((a, days) => a + Object.values(days).filter((e) => e.v > 0).length, 0);
  const notes = Object.values(d.log).reduce((a, days) => a + Object.values(days).filter((e) => e.note).length, 0) + Object.keys(d.reviews).length;
  const bytes = JSON.stringify(d.log).length + JSON.stringify(d.habits).length + JSON.stringify(d.reviews).length + JSON.stringify(d.ops).length;
  const noteBytes = Object.values(d.log).reduce((a, days) => a + Object.values(days).reduce((b, e) => b + (e.note?.length ?? 0), 0), 0) + JSON.stringify(d.reviews).length;
  const habitBytes = JSON.stringify(d.habits).length + JSON.stringify(d.settings).length + JSON.stringify(d.routines).length + JSON.stringify(d.goals).length;
  const total = Math.max(1, bytes);
  const store = [
    { l: 'Check-ins', w: Math.max(0, total - noteBytes - habitBytes) / total, c: p.bar },
    { l: 'Notes & reviews', w: noteBytes / total, c: p.ac },
    { l: 'Habits & settings', w: habitBytes / total, c: p.sf2 },
  ];
  const size = bytes > 1e6 ? (bytes / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  const last = d.lastBackup ? new Date(d.lastBackup).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'never';

  const doExport = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      try {
        const w = exportData(s.exportFormat, s.exportNotes);
        useUI.getState().openSheet({ k: 'exported', ...w });
      } catch {
        useUI.getState().toast('Export failed — nothing was changed. Try again?');
      } finally {
        setBusy(false);
      }
    }, 50);
  };

  return (
    <Page bar={<AppBar title="Data & backup" />}>
      <View style={{ padding: 16, paddingHorizontal: 20, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="device-mobile" size={16.5} color={p.tx} />
          <Txt size={13.5} w={500}>Stored on this device</Txt>
        </View>
        <Txt size={12} color={p.mu}>{d.habits.length} habits · {fmtNum(checkins)} check-ins · {notes} notes · {size}</Txt>
        <View style={{ marginTop: 4 }}>
          <Segments height={14} parts={store.map((x) => ({ w: x.w, color: x.c }))} />
        </View>
        <Legend items={store.map((x) => ({ label: `${x.l} ${Math.round(x.w * 100)}%`, swatch: <Swatch color={x.c} /> }))} />
      </View>

      <Rule />
      <View style={{ padding: 16, paddingHorizontal: 20, gap: 10 }}>
        <Label>Export — it’s your data</Label>
        <Seg options={['JSON', 'CSV'] as const} value={s.exportFormat} onChange={(exportFormat) => setSettings({ exportFormat })} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Txt size={13} style={{ flex: 1 }}>Include notes & reviews</Txt>
          <Switch on={s.exportNotes} onToggle={() => setSettings({ exportNotes: !s.exportNotes })} label="Include notes" />
        </View>
        <Btn label={busy ? 'Exporting…' : 'Export as ' + s.exportFormat} icon="download-simple" height={46} size={13.5} color={p.acx} style={{ borderColor: busy ? p.fa : p.ac }} onPress={doExport} />
      </View>

      <Rule />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          try {
            const w = backupNow();
            useUI.getState().toast(Platform.OS === 'web' ? 'Backup downloaded' : 'Backup saved to device storage');
            void w;
          } catch {
            useUI.getState().toast('Backup failed — your data is unchanged.');
          }
        }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: pressed ? p.sf : 'transparent' })}
      >
        <Icon name="hard-drives" size={19} color={p.tx} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt size={13.5} w={500}>Back up now</Txt>
          <Txt size={11.5} color={p.mu}>Last backup: {last}</Txt>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => useUI.getState().openSheet({ k: 'restore' })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: pressed ? p.sf : 'transparent' })}>
        <Icon name="upload-simple" size={19} color={p.tx} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt size={13.5} w={500}>Restore or import</Txt>
          <Txt size={11.5} color={p.mu}>From a HabitFlow backup file</Txt>
        </View>
      </Pressable>

      <View style={{ marginTop: 16, marginHorizontal: 20, marginBottom: 24, padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: p.ln2, borderRadius: 8, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="cloud-slash" size={15} color={p.tx} />
          <Txt size={13} w={500}>Sync across devices — later</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 14, backgroundColor: p.act }}><Txt size={11} w={500} color={p.acx}>This phone</Txt></View>
          <Icon name="arrow-right" size={12} color={p.tx} />
          <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: p.ln2 }}><Txt size={11} w={500} color={p.mu}>Sync layer</Txt></View>
          <Icon name="arrow-right" size={12} color={p.fa} />
          <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: p.ln2 }}><Txt size={11} w={500} color={p.mu}>Cloud</Txt></View>
        </View>
        <Txt size={11.5} lh={1.5} color={p.mu}>When it arrives it will be opt-in. Nothing leaves this device until you turn it on. Every change is already kept in a local operation log ({fmtNum(d.ops.length)} so far), ready for it.</Txt>
      </View>
    </Page>
  );
}
