import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { completeTimer, timerElapsedMin } from '@/store/actions';
import { getData, useData, type Data } from '@/store/data';
import { syncNow } from './cloud';
import { applyResponse, reschedule, setupNotifications } from './notifications';

/** Keeps reminders and home-screen widgets in step with local data. */
export function useBackgroundSync() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    setupNotifications().then(() => reschedule());

    let rt: ReturnType<typeof setTimeout> | undefined;
    let wt: ReturnType<typeof setTimeout> | undefined;
    let ct: ReturnType<typeof setTimeout> | undefined;
    // Drive sync runs only when signed in and auto-sync is on; the app never waits for it.
    const canSync = () => {
      const d = getData();
      return !!d.profile.email && d.sync.autoSync;
    };
    const cloud = (delay: number) => {
      clearTimeout(ct);
      if (canSync()) ct = setTimeout(() => syncNow(), delay);
    };
    cloud(2000);
    const unsub = useData.subscribe((s: Data, prev: Data) => {
      const lastOp = s.ops[s.ops.length - 1]?.op ?? '';
      if (!lastOp.startsWith('sync') && (s.log !== prev.log || s.habits !== prev.habits || s.routines !== prev.routines || s.goals !== prev.goals || s.reviews !== prev.reviews || s.profile !== prev.profile)) cloud(20000);
      if (s.habits !== prev.habits || s.settings !== prev.settings || s.routines !== prev.routines || s.onboarded !== prev.onboarded || (s.settings.eveningCatchUp && s.log !== prev.log)) {
        clearTimeout(rt);
        rt = setTimeout(() => reschedule(getData()), 800);
      }
      if (Platform.OS === 'android' && (s.log !== prev.log || s.habits !== prev.habits || s.settings !== prev.settings)) {
        clearTimeout(wt);
        wt = setTimeout(() => {
          import('@/widgets/task-handler').then((m) => m.refreshWidgets()).catch(() => undefined);
        }, 400);
      }
    });

    const open = async (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const to = await applyResponse(r);
      Notifications.clearLastNotificationResponse();
      if (to) router.push(to as never);
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    // A timer that ran out while the app was away is logged as soon as we're back.
    const settleTimer = () => {
      const t = getData().timer;
      if (t && !t.done && t.startedAt && timerElapsedMin(t) >= t.targetMin) completeTimer();
    };
    settleTimer();
    // Returning to the app picks up anything a widget or notification wrote while it was away.
    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        useData.persist.rehydrate()?.then(settleTimer);
        const last = getData().sync.lastSyncAt ?? 0;
        if (Date.now() - last > 5 * 60000) cloud(1500);
      } else if (st === 'background') cloud(0);
    });

    return () => {
      unsub();
      sub.remove();
      app.remove();
      clearTimeout(rt);
      clearTimeout(wt);
      clearTimeout(ct);
    };
  }, [router]);
}
