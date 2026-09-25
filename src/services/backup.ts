// Export, backup and restore. Files are written to this device only; sharing
// them anywhere is always the user's explicit choice.

import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { todayKey } from '@/domain/dates';
import { statusOn } from '@/domain/status';
import { DATA_VERSION, getData, useData, type Data } from '@/store/data';

const MAGIC = 'habitflow-backup';

function backupDir(): Directory {
  const d = new Directory(Paths.document, 'backups');
  if (!d.exists) d.create({ idempotent: true, intermediates: true });
  return d;
}

function kb(bytes: number) {
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

const SL: Record<string, string> = { d: 'done', p: 'partial', s: 'skipped', m: 'missed', n: 'open', o: 'off' };

export function toCSV(d: Data, withNotes: boolean): string {
  const today = todayKey();
  const esc = (s: string) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
  const rows = [['date', 'habit', 'type', 'status', 'value', 'target', 'unit', ...(withNotes ? ['note'] : [])].join(',')];
  for (const h of d.habits) {
    const days = Object.keys(d.log[h.id] ?? {}).sort();
    for (const k of days) {
      const e = d.log[h.id][k];
      rows.push([k, esc(h.name), h.type, SL[statusOn(h, d.log, k, today)], String(e.v), String(e.t ?? h.target), esc(h.unit), ...(withNotes ? [esc(e.note ?? '')] : [])].join(','));
    }
  }
  if (withNotes) for (const [k, r] of Object.entries(d.reviews)) rows.push([k, 'Daily review', '', '', '', '', '', esc(`Helped: ${r.helped} / Got in the way: ${r.blocked}`)].join(','));
  return rows.join('\n');
}

function payload(d: Data, withNotes: boolean) {
  const { ops, timer, ...rest } = d;
  const log = withNotes ? rest.log : Object.fromEntries(Object.entries(rest.log).map(([id, days]) => [id, Object.fromEntries(Object.entries(days).map(([k, e]) => [k, { ...e, note: undefined }]))]));
  return { magic: MAGIC, version: DATA_VERSION, exportedAt: new Date().toISOString(), data: { ...rest, log, reviews: withNotes ? rest.reviews : {} } };
}

export interface Written {
  file: string;
  size: string;
  uri: string;
}

/** Writes an export to the app's documents folder. On web it downloads instead. */
export function exportData(format: 'JSON' | 'CSV', withNotes: boolean): Written {
  const d = getData();
  const name = `habitflow-${todayKey()}.${format.toLowerCase()}`;
  const text = format === 'JSON' ? JSON.stringify(payload(d, withNotes), null, 2) : toCSV(d, withNotes);
  if (Platform.OS === 'web') return webDownload(name, text, format === 'JSON' ? 'application/json' : 'text/csv');
  const f = new File(Paths.document, name);
  f.create({ overwrite: true });
  f.write(text);
  return { file: name, size: kb(f.size), uri: f.uri };
}

export function backupNow(): Written {
  const name = `habitflow-backup-${todayKey()}.hfbak`;
  const text = JSON.stringify(payload(getData(), true));
  if (Platform.OS === 'web') return webDownload(name, text, 'application/json');
  const f = new File(backupDir(), name);
  f.create({ overwrite: true });
  f.write(text);
  useData.getState().commit('backup', { name }, () => ({ lastBackup: Date.now() }));
  return { file: name, size: kb(f.size), uri: f.uri };
}

export interface BackupFile {
  name: string;
  uri: string;
  sub: string;
}

export function listBackups(): BackupFile[] {
  if (Platform.OS === 'web') return [];
  return backupDir()
    .list()
    .filter((x): x is File => x instanceof File && x.name.endsWith('.hfbak'))
    .map((f) => ({ f, t: f.modificationTime ?? 0 }))
    .sort((a, b) => b.t - a.t)
    .map(({ f, t }) => ({ name: f.name, uri: f.uri, sub: `${new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${kb(f.size)} · this device` }));
}

export async function pickFile(): Promise<BackupFile | null> {
  if (Platform.OS === 'web') return null;
  const r = await File.pickFileAsync();
  if (r.canceled) return null;
  return { name: r.result.name, uri: r.result.uri, sub: 'Picked file' };
}

export type RestoreCheck = { ok: true; data: Partial<Data> } | { ok: false; reason: 'newer' | 'invalid' };

export async function readBackup(uri: string): Promise<RestoreCheck> {
  try {
    const parsed = JSON.parse(await new File(uri).text());
    if (parsed?.magic !== MAGIC || typeof parsed.data !== 'object') return { ok: false, reason: 'invalid' };
    if (Number(parsed.version) > DATA_VERSION) return { ok: false, reason: 'newer' };
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

/** Backs up current data first, then replaces it. */
export async function restore(uri: string): Promise<RestoreCheck> {
  const check = await readBackup(uri);
  if (!check.ok) return check;
  backupNow();
  useData.getState().commit('restore', { uri }, (d) => ({ ...check.data, timer: null, settings: { ...d.settings, ...(check.data.settings ?? {}) }, lastBackup: Date.now() }));
  return check;
}

export async function share(uri: string) {
  if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri);
}

function webDownload(name: string, text: string, type: string): Written {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { file: name, size: kb(blob.size), uri: url };
}
