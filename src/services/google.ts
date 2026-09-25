// Google account, used for one thing only: a copy of your progress in the
// hidden app folder of your own Google Drive. The app can't see any of your
// other Drive files, email or contacts.

import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const googleAvailable = Platform.OS === 'android' || Platform.OS === 'ios';

export interface GoogleAccount {
  email: string;
  name: string | null;
  photo: string | null;
}

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({
    scopes: [DRIVE_SCOPE],
    // Optional: only needed if you later want an ID token for a server.
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  });
  configured = true;
}

/** A readable message for sign-in failures, including the common setup mistake. */
export function explain(e: unknown): string {
  if (isErrorWithCode(e)) {
    if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return 'Google Play services is missing or out of date on this phone.';
    if (e.code === statusCodes.IN_PROGRESS) return 'Sign-in is already in progress.';
    if (e.code === '10' || /DEVELOPER_ERROR/.test(e.message)) return 'Google sign-in isn’t set up for this build yet (DEVELOPER_ERROR). The app’s SHA-1 needs adding to its Google Cloud OAuth client — see the README.';
    if (e.code === '7' || /NETWORK/i.test(e.message)) return 'No connection. Your data is safe on this phone — try again when you’re online.';
  }
  return e instanceof Error ? e.message : 'Something went wrong with Google sign-in.';
}

/** Interactive sign-in. Returns null if the person cancels. */
export async function signIn(): Promise<GoogleAccount | null> {
  if (!googleAvailable) throw new Error('Google sign-in works in the Android app.');
  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const r = await GoogleSignin.signIn();
  if (!isSuccessResponse(r)) return null;
  const u = r.data.user;
  if (!r.data.scopes.includes(DRIVE_SCOPE)) {
    const more = await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
    if (!more || !isSuccessResponse(more)) throw new Error('Drive access is needed to keep a copy of your progress.');
  }
  return { email: u.email, name: u.name, photo: u.photo };
}

/** A fresh Drive access token, signing in silently if the session was restored. */
export async function accessToken(): Promise<string> {
  configure();
  if (!GoogleSignin.getCurrentUser()) {
    const r = await GoogleSignin.signInSilently();
    if (r.type !== 'success') throw new Error('Signed out of Google — sign in again to sync.');
  }
  return (await GoogleSignin.getTokens()).accessToken;
}

/** Drops a cached token after the Drive API rejects it, so the next call gets a new one. */
export async function refreshToken(token: string) {
  await GoogleSignin.clearCachedAccessToken(token).catch(() => undefined);
}

export async function signOut() {
  if (!googleAvailable) return;
  configure();
  await GoogleSignin.signOut().catch(() => undefined);
}

/** Signs out and removes this app's permission from the Google account. */
export async function disconnect() {
  if (!googleAvailable) return;
  configure();
  await GoogleSignin.revokeAccess().catch(() => undefined);
  await GoogleSignin.signOut().catch(() => undefined);
}
