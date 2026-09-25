// Google Drive sync. Progress is kept in one JSON file in the Drive "app data"
// folder — private to HabitFlow and hidden from the Drive UI. Local data
// always comes first: sync merges, it never replaces.

import { merge, type SyncPayload } from '@/domain/merge';
import { DATA_VERSION, getData, useData, type Data } from '@/store/data';
import { accessToken, refreshToken } from './google';

const FILE = 'habitflow-sync.json';
const MAGIC = 'habitflow-sync';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export type SyncResult = { ok: true; merged: boolean } | { ok: false; error: string };

function toPayload(d: Data): SyncPayload {
  const { onboarded, habits, log, routines, runs, goals, reviews, xp, profile, deleted } = d;
  return { onboarded, habits, log, routines, runs, goals, reviews, xp, profile, deleted };
}

async function drive(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await accessToken();
  const res = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } });
  if (res.status === 401 && retry) {
    await refreshToken(token);
    return drive(path, init, false);
  }
  if (!res.ok && res.status !== 404) throw new Error(`Google Drive error ${res.status}`);
  return res;
}

async function findFile(known: string | null): Promise<string | null> {
  if (known) {
    const r = await drive(`${API}/${known}?fields=id,trashed`);
    if (r.ok) {
      const f = (await r.json()) as { id: string; trashed?: boolean };
      if (!f.trashed) return f.id;
    }
  }
  const q = encodeURIComponent(`name='${FILE}' and trashed=false`);
  const r = await drive(`${API}?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`);
  const { files } = (await r.json()) as { files: { id: string }[] };
  return files[0]?.id ?? null;
}

async function download(id: string): Promise<SyncPayload | null> {
  const r = await drive(`${API}/${id}?alt=media`);
  if (!r.ok) return null;
  const body = (await r.json()) as { magic?: string; version?: number; data?: SyncPayload };
  if (body.magic !== MAGIC || !body.data) return null;
  if ((body.version ?? 0) > DATA_VERSION) throw new Error('Your Drive copy was saved by a newer HabitFlow. Update the app to sync.');
  return body.data;
}

async function upload(id: string | null, data: SyncPayload): Promise<string> {
  const body = JSON.stringify({ magic: MAGIC, version: DATA_VERSION, savedAt: new Date().toISOString(), data });
  if (id) {
    await drive(`${UPLOAD}/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
    return id;
  }
  const boundary = 'habitflow' + Date.now();
  const meta = JSON.stringify({ name: FILE, parents: ['appDataFolder'], mimeType: 'application/json' });
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const r = await drive(`${UPLOAD}?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart });
  return ((await r.json()) as { id: string }).id;
}

let inflight: Promise<SyncResult> | null = null;

/** Pull the Drive copy, merge it into this phone, and push the result back. */
export function syncNow(): Promise<SyncResult> {
  if (inflight) return inflight;
  inflight = (async (): Promise<SyncResult> => {
    const d = getData();
    if (!d.profile.email) return { ok: false, error: 'Sign in with Google to sync.' };
    try {
      const id = await findFile(d.sync.fileId);
      const remote = id ? await download(id) : null;
      const local = toPayload(getData());
      const merged = remote ? merge(local, remote) : local;
      if (remote) {
        // Only the synced fields change; anything done meanwhile on this phone is merged in too.
        useData.getState().commit('sync-merge', { from: 'drive' }, (cur) => ({ ...merge(toPayload(cur), merged), profile: { ...cur.profile, ...merged.profile, email: cur.profile.email, photo: cur.profile.photo } }));
      }
      const fileId = await upload(id, toPayload(getData()));
      useData.getState().commit('sync-done', { fileId }, (cur) => ({ sync: { ...cur.sync, fileId, lastSyncAt: Date.now(), lastError: null } }));
      return { ok: true, merged: !!remote };
    } catch (e) {
      const error = e instanceof Error ? (/Network request failed/i.test(e.message) ? 'No connection — will sync when you’re back online.' : e.message) : 'Sync failed.';
      useData.getState().commit('sync-error', { error }, (cur) => ({ sync: { ...cur.sync, lastError: error } }));
      return { ok: false, error };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Removes the Drive copy. This phone's data is untouched. */
export async function deleteCloudCopy(): Promise<SyncResult> {
  try {
    const id = await findFile(getData().sync.fileId);
    if (id) await drive(`${API}/${id}`, { method: 'DELETE' });
    useData.getState().commit('sync-delete', null, (cur) => ({ sync: { ...cur.sync, fileId: null, lastSyncAt: null, lastError: null } }));
    return { ok: true, merged: false };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete the Drive copy.' };
  }
}
