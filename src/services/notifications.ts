// Local reminders with Done / Snooze / Skip actions. Everything is scheduled
// on the device — nothing goes through a server.

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { todayKey } from '@/domain/dates';
import { typicalCheckin } from '@/domain/insights';
import { currentSchedule, isDoneOn, streakOf } from '@/domain/status';
import type { Habit } from '@/domain/types';
import { skip, streakOpts, toggle, increment, startTimer } from '@/store/actions';
import { getData, useData, type Data } from '@/store/data';

export const CATEGORY = 'habit';
export const CHANNEL = 'reminders';
const TASK = 'habitflow-notification-actions';
const supported = Platform.OS !== 'web';

const inQuiet = (hhmm: string) => hhmm >= '22:00' || hhmm < '07:00';

function reminderTime(h: Habit, d: Data): string | null {
  if (!h.reminder) return null;
  if (!(d.settings.smartTiming || h.smartReminder)) return h.reminder;
  // Smart timing moves the reminder part-way toward when you usually check in, never more than 45 min.
  const typical = typicalCheckin(h, d.log, todayKey());
  if (!typical) return h.reminder;
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const r = toMin(h.reminder);
  const shift = Math.max(-45, Math.min(45, Math.round((toMin(typical) - r) / 2)));
  const m = (r + shift + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

export function bodyFor(h: Habit, d: Data): string {
  const s = streakOf(h, d.log, todayKey(), streakOpts(d));
  const anchor = h.stackAfter ? d.habits.find((x) => x.id === h.stackAfter)?.name : null;
  const run = s.current > 1 ? `You're on a ${s.current}-${s.unit === 'weeks' ? 'week' : 'day'} run.` : 'Small and steady.';
  return anchor ? `Right after ${anchor}. ${run}` : run;
}

export function titleFor(h: Habit): string {
  return h.type === 'dur' ? `${h.name} · ${h.target} min` : h.type === 'qty' ? `${h.name} · ${h.target.toLocaleString('en-US')} ${h.unit}` : h.name;
}

export async function setupNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Habit reminders', importance: Notifications.AndroidImportance.DEFAULT });
  }
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: 'DONE', buttonTitle: 'Done', options: { opensAppToForeground: false } },
    { identifier: 'SNOOZE', buttonTitle: 'Snooze 15m', options: { opensAppToForeground: false } },
    { identifier: 'SKIP', buttonTitle: 'Skip', options: { opensAppToForeground: false } },
  ]);
}

export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Replace every scheduled reminder with ones that match the current habits and settings. */
export async function reschedule(d: Data = getData()) {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const st = d.settings;
  if (!st.remindersOn || !d.onboarded) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const quiet = (t: string) => st.quietHours && inQuiet(t);
  const at = (t: string) => ({ hour: Number(t.slice(0, 2)), minute: Number(t.slice(3)) });
  const jobs: Promise<unknown>[] = [];

  for (const h of d.habits) {
    if (h.archived || h.paused) continue;
    const t = reminderTime(h, d);
    if (!t || quiet(t)) continue;
    const content = { title: titleFor(h), body: bodyFor(h, d), categoryIdentifier: CATEGORY, data: { habitId: h.id } };
    const s = currentSchedule(h);
    if (s.kind === 'daily' || s.kind === 'perWeek') {
      jobs.push(Notifications.scheduleNotificationAsync({ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL, ...at(t) } }));
    } else {
      const days = s.kind === 'weekdays' ? [true, true, true, true, true, false, false] : s.days;
      days.forEach((on, i) => {
        // expo weekday: 1 = Sunday … 7 = Saturday; ours: 0 = Monday.
        if (on) jobs.push(Notifications.scheduleNotificationAsync({ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, channelId: CHANNEL, weekday: ((i + 1) % 7) + 1, ...at(t) } }));
      });
    }
  }
  if (st.routineReminders) {
    for (const r of d.routines) {
      if (quiet(r.time) || !r.steps.length) continue;
      jobs.push(Notifications.scheduleNotificationAsync({
        content: { title: `${r.name} routine`, body: `${r.steps.length} steps, one at a time. Tap to start.`, data: { routineId: r.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL, ...at(r.time) },
      }));
    }
  }
  if (st.morningSummary) {
    jobs.push(Notifications.scheduleNotificationAsync({
      content: { title: 'Your day in HabitFlow', body: 'A quick look at what’s planned today.', data: { open: 'today' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL, hour: 8, minute: 0 },
    }));
  }
  if (st.eveningCatchUp) {
    // One note at 20:00, only if something is still open today.
    const today = todayKey();
    const open = d.habits.filter((h) => !h.archived && !h.paused && h.type !== 'avoid' && !isDoneOn(h, d.log, today, today) && !d.log[h.id]?.[today]?.skip);
    const eight = new Date();
    eight.setHours(20, 0, 0, 0);
    if (open.length && eight.getTime() > Date.now()) {
      jobs.push(Notifications.scheduleNotificationAsync({
        content: { title: `${open.length} habit${open.length === 1 ? '' : 's'} still open`, body: 'There’s time — or let them go. Tomorrow is a fresh page.', data: { open: 'today' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, channelId: CHANNEL, date: eight },
      }));
    }
  }
  await Promise.all(jobs);
}

/** Schedules a one-off "timer finished" notification; returns its id. */
export async function scheduleTimerDone(name: string, endsAt: number): Promise<string | null> {
  if (!supported || endsAt <= Date.now()) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: `${name} — done`, body: 'Timer finished. Nicely done.', data: { open: 'timer' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, channelId: CHANNEL, date: endsAt },
  });
}

export async function cancel(id: string | null | undefined) {
  if (supported && id) await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Applies a notification button press to local data. Returns a route to
 * open for a plain tap, or null when the action was handled in place.
 */
export async function applyResponse(r: Notifications.NotificationResponse): Promise<string | null> {
  const data = r.notification.request.content.data as { habitId?: string; routineId?: string; open?: string };
  if (data.routineId) return `/routine/${data.routineId}`;
  if (data.open === 'timer') return '/timer';
  if (!data.habitId) return '/';
  const h = getData().habits.find((x) => x.id === data.habitId);
  if (!h) return '/';
  const today = todayKey();
  switch (r.actionIdentifier) {
    case 'DONE':
      if (!isDoneOn(h, getData().log, today, today)) {
        if (h.type === 'qty') increment(h.id, 1, { quiet: true });
        else toggle(h.id, { quiet: true });
      }
      await dismiss(r);
      return null;
    case 'SKIP':
      skip(h.id, { quiet: true });
      await dismiss(r);
      return null;
    case 'SNOOZE':
      await dismiss(r);
      await Notifications.scheduleNotificationAsync({
        content: (({ title, body, data: d }) => ({ title, body: body ?? undefined, data: d, categoryIdentifier: CATEGORY }))(r.notification.request.content),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, channelId: CHANNEL, seconds: 15 * 60 },
      });
      return null;
    default:
      if (h.type === 'dur' && !isDoneOn(h, getData().log, today, today)) {
        startTimer(h.id);
        return '/timer';
      }
      return `/habit/${h.id}`;
  }
}

async function dismiss(r: Notifications.NotificationResponse) {
  await Notifications.dismissNotificationAsync(r.notification.request.identifier).catch(() => undefined);
}

/** Android runs this for action buttons pressed while the app is in the background or closed. */
export function registerBackgroundActions() {
  if (Platform.OS !== 'android') return;
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(TASK, async ({ data }) => {
    if (!data || !('actionIdentifier' in data)) return;
    await useData.persist.rehydrate();
    await applyResponse(data);
  });
  Notifications.registerTaskAsync(TASK).catch(() => undefined);
}

