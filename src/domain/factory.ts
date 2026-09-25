import { stepFor, type Starter } from './catalog';
import type { DateKey, Habit, Schedule } from './types';

let counter = 0;
export function uid(prefix = 'h'): string {
  counter = (counter + 1) % 1e6;
  return prefix + Date.now().toString(36) + counter.toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}

export function scheduleFromStarter(s: Starter): Schedule {
  if (s.sched === 'weekdays') return { kind: 'weekdays' };
  if (s.sched === 'perWeek') return { kind: 'perWeek', n: s.perWeek ?? 3 };
  return { kind: 'daily' };
}

export function habitFromStarter(s: Starter, createdAt: DateKey, id = s.id): Habit {
  const target = s.type === 'qty' || s.type === 'dur' ? s.target ?? 1 : 1;
  return {
    id,
    name: s.name,
    icon: s.icon,
    type: s.type,
    target,
    unit: s.unit ?? (s.type === 'dur' ? 'min' : ''),
    step: s.type === 'qty' ? stepFor(target) : 1,
    time: s.time,
    cat: s.cat,
    schedules: [{ from: createdAt, s: scheduleFromStarter(s) }],
    reminder: s.reminder ?? null,
    smartReminder: false,
    grace: true,
    stackAfter: null,
    est: s.est,
    paused: false,
    pauses: [],
    archived: false,
    createdAt,
  };
}
