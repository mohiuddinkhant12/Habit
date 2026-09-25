import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { AppBar, Bar, Btn, Page, Txt } from '@/components/ui';
import { streakOf } from '@/domain/status';
import { cancel, scheduleTimerDone } from '@/services/notifications';
import { closeTimer, completeTimer, extendTimer, finishEarly, pauseTimer, resumeTimer, timerElapsedMin } from '@/store/actions';
import { useData } from '@/store/data';
import { useStreakOpts, useToday } from '@/store/hooks';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';
import { useAnim } from '@/components/anim';

export default function TimerScreen() {
  const { p, t2 } = useT();
  const router = useRouter();
  const today = useToday();
  const opts = useStreakOpts();
  const t = useData((s) => s.timer);
  const h = useData((s) => s.habits.find((x) => x.id === s.timer?.habitId));
  const log = useData((s) => s.log);
  const xpOn = useData((s) => s.settings.xpOn);
  const [now, setNow] = useState(() => Date.now());
  const notif = useRef<string | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, []);

  // A notification fires at the finish time in case the screen is off.
  useEffect(() => {
    let live = true;
    if (t && h && t.startedAt && !t.done) {
      const endsAt = t.startedAt + (t.targetMin * 60000 - t.accumulatedMs);
      scheduleTimerDone(h.name, endsAt).then((id) => {
        if (live) notif.current = id;
        else cancel(id);
      });
    }
    return () => {
      live = false;
      cancel(notif.current);
      notif.current = null;
    };
  }, [t?.startedAt, t?.targetMin, t?.done, h?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const el = t ? timerElapsedMin(t, now) : 0;
  useEffect(() => {
    if (t && !t.done && el >= t.targetMin) completeTimer();
  }, [el, t]);

  const close = () => {
    closeTimer();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!t || !h) {
    return (
      <Page bar={<AppBar icon="x" onBack={close} />}>
        <View style={{ padding: 24, gap: 8 }}>
          <Txt size={20} w={500}>No timer running.</Txt>
          <Txt size={12.5} color={p.mu}>Start a timed habit from Today.</Txt>
        </View>
      </Page>
    );
  }

  const shown = Math.min(el, t.targetMin);
  const mm = Math.floor(shown);
  const ss = Math.floor((shown - mm) * 60);
  const anchor = h.stackAfter ? useData.getState().habits.find((x) => x.id === h.stackAfter)?.name : null;
  const ticks = Math.min(60, Math.round(t.targetMin));
  const streak = streakOf(h, log, today, opts).current;

  return (
    <Page scroll={false} bar={<AppBar icon="x" onBack={close} sub={anchor ? 'After ' + anchor : 'Timed habit'} />}>
      <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: 24, paddingBottom: 24, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name={h.icon} size={26} color={p.ac} />
          <Txt size={24} w={500} ls={-0.025}>{h.name}</Txt>
        </View>
        {!t.done ? (
          <>
            <View style={{ gap: 4, marginTop: 24 }} accessibilityRole="timer" accessibilityLabel={`${mm} minutes ${ss} seconds of ${t.targetMin}`}>
              <Txt size={79} w={300} ls={-0.05} lh={0.95} tab>{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</Txt>
              <Txt size={13.5} color={p.mu}>of {t.targetMin}:00</Txt>
            </View>
            <Bar v={shown / t.targetMin} height={10} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: ticks }, (_, k) => {
                const at = (k / ticks) * t.targetMin;
                const next = ((k + 1) / ticks) * t.targetMin;
                return <View key={k} style={{ width: `${100 / Math.min(10, ticks) - 1}%`, flexGrow: 1, height: 18, borderRadius: 5, backgroundColor: shown >= next ? p.ac : shown >= at ? p.tx : p.sf2 }} />;
              })}
            </View>
            <Txt size={11} color={p.mu}>{Platform.OS === 'web' ? 'Closing this screen pauses the timer — resume it from Today.' : 'Keeps running with the screen off — you’ll get a notification when it’s done. Closing this screen pauses it.'}</Txt>
            <View style={{ flex: 1 }} />
            <View style={{ gap: 8 }}>
              {t.startedAt ? <Btn variant="primary" label="Pause" icon="pause" size={14.5} onPress={pauseTimer} /> : <Btn variant="primary" label="Resume" icon="play" size={14.5} onPress={resumeTimer} />}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label="+5 min" icon="plus" style={{ flex: 1, paddingHorizontal: 14 }} onPress={() => extendTimer(5)} />
                <Btn
                  label="Finish early"
                  icon="stop"
                  style={{ flex: 1, paddingHorizontal: 14 }}
                  onPress={() => {
                    finishEarly();
                    close();
                  }}
                />
              </View>
            </View>
          </>
        ) : (
          <Done
            text={`${t.targetMin} minutes.`}
            sub={`${streak}-day streak${xpOn ? '  ·  +10 XP' : ''}`}
            ticks={ticks}
            onNote={() => useUI.getState().openSheet({ k: 'note', id: h.id, date: t.date })}
            onClose={close}
            anim={t2}
          />
        )}
      </View>
    </Page>
  );
}

function Done({ text, sub, ticks, onNote, onClose, anim }: { text: string; sub: string; ticks: number; onNote: () => void; onClose: () => void; anim: number }) {
  const { p } = useT();
  const s = useAnim(anim ? 0.3 : 1);
  useEffect(() => {
    if (anim) Animated.timing(s, { toValue: 1, duration: 400, easing: Easing.out(Easing.back(3)), useNativeDriver: true }).start();
  }, [s, anim]);
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', gap: 14 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: p.ac, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ transform: [{ scale: s }] }}>
          <Icon name="check" size={40} color={p.onac} />
        </Animated.View>
      </View>
      <Txt size={39} w={300} ls={-0.05} lh={0.95} accessibilityRole="header">{text}{'\n'}Done.</Txt>
      <Txt size={13.5} color={p.mu}>{sub}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
        {Array.from({ length: ticks }, (_, k) => (
          <View key={k} style={{ width: `${100 / Math.min(10, ticks) - 1}%`, flexGrow: 1, height: 10, borderRadius: 99, backgroundColor: p.ac }} />
        ))}
      </View>
      <Btn label="Add a note" icon="note" onPress={onNote} />
      <Btn variant="primary" label="Back to Today" icon="arrow-right" height={46} size={13.5} onPress={onClose} />
    </View>
  );
}
