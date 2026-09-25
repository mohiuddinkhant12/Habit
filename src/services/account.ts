import { router } from 'expo-router';

import type { Profile } from '@/domain/types';
import { resetAll } from '@/store/actions';
import { useData } from '@/store/data';
import { useUI } from '@/store/ui';
import { deleteCloudCopy, syncNow } from './cloud';
import { disconnect, explain, signIn, signOut } from './google';

export function setProfile(p: Partial<Omit<Profile, 'email' | 'photo' | 'updatedAt'>>) {
  useData.getState().commit('profile', p, (d) => ({ profile: { ...d.profile, ...p, updatedAt: Date.now() } }));
}

/** Sign in with Google, then merge this phone with the Drive copy. */
export async function connectGoogle(): Promise<void> {
  try {
    const acc = await signIn();
    if (!acc) return;
    useData.getState().commit('google-signin', { email: acc.email }, (d) => ({
      profile: { ...d.profile, email: acc.email, photo: acc.photo, name: d.profile.name || acc.name || '', updatedAt: d.profile.name ? d.profile.updatedAt : Date.now() },
      sync: { ...d.sync, lastError: null },
    }));
    const r = await syncNow();
    useUI.getState().toast(r.ok ? (r.merged ? 'Signed in — progress from your Drive merged in' : 'Signed in — progress saved to your Drive') : r.error);
  } catch (e) {
    useUI.getState().toast(explain(e));
  }
}

export async function runSync() {
  const r = await syncNow();
  useUI.getState().toast(r.ok ? 'Synced with Google Drive' : r.error);
}

/** Signs out. Everything stays on this phone; the Drive copy stays too. */
export async function signOutGoogle(forget = false) {
  await (forget ? disconnect() : signOut());
  useData.getState().commit('google-signout', null, (d) => ({ profile: { ...d.profile, email: null, photo: null }, sync: { ...d.sync, fileId: null, lastSyncAt: null, lastError: null } }));
  useUI.setState({ dialog: null });
  useUI.getState().toast('Signed out. Your progress is still on this phone.');
}

export async function removeCloudCopy() {
  useUI.setState({ dialog: null });
  const r = await deleteCloudCopy();
  useUI.getState().toast(r.ok ? 'Drive copy deleted. This phone still has everything.' : r.error);
}

/** Erase everything on this phone (after signing out). The Drive copy, if any, is kept. */
export async function eraseThisPhone() {
  await signOut();
  useUI.setState({ dialog: null, sheet: null });
  resetAll();
  router.replace('/welcome');
}
