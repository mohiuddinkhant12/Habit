export type HabitType = 'bool' | 'qty' | 'dur' | 'avoid';
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Anytime';
export type Category = 'Health' | 'Mind' | 'Learning' | 'Fitness' | 'Sleep' | 'Spiritual' | 'Work' | 'Money';

/** Local calendar day, `YYYY-MM-DD`. */
export type DateKey = string;

export type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays' }
  | { kind: 'days'; days: boolean[] } // Monday-first, 7 entries
  | { kind: 'perWeek'; n: number };

export interface Habit {
  id: string;
  name: string;
  icon: string;
  type: HabitType;
  /** Count for `qty`, minutes for `dur`, 1 otherwise. */
  target: number;
  unit: string;
  /** Increment used by the + control. */
  step: number;
  time: TimeOfDay;
  cat: Category;
  /** Schedule versions — edits apply from their `from` day so history keeps the schedule it had. */
  schedules: { from: DateKey; s: Schedule }[];
  reminder: string | null; // HH:MM
  smartReminder: boolean;
  grace: boolean;
  stackAfter: string | null;
  /** Estimated minutes — sizes routine steps. */
  est: number;
  paused: boolean;
  pauses: { from: DateKey; to: DateKey | null }[];
  archived: boolean;
  createdAt: DateKey;
}

/** One habit on one day. */
export interface Entry {
  v: number; // bool: 0/1, qty: amount, dur: minutes, avoid: 0
  t?: number; // target at the time of logging
  skip?: boolean;
  slip?: boolean;
  note?: string;
  at?: number; // epoch ms of the last check-in, for smart reminders
}

export type Log = Record<string, Record<DateKey, Entry>>;

/** d done · p partial · s skipped · m missed · n not yet (today) · o off day · f future */
export type Status = 'd' | 'p' | 's' | 'm' | 'n' | 'o' | 'f';

export interface Routine {
  id: string;
  name: string;
  time: string; // HH:MM
  steps: string[];
}

export interface RoutineRun {
  routineId: string;
  date: DateKey;
  results: ('d' | 's')[];
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  unit: string;
  habitId: string;
  /** How habit check-ins feed the goal. */
  metric: 'sum' | 'count';
  /** Divide the metric by this (pages → books, minutes → hours). */
  scale: number;
  /** Progress carried in from before this device's history. */
  base: number;
  year: number;
}

export interface Review {
  helped: string;
  blocked: string;
}

export interface Settings {
  theme: 'Light' | 'Dark' | 'System';
  accent: 'Blurple' | 'Lilac' | 'Slate';
  density: 'Comfortable' | 'Compact';
  reduceMotion: boolean;
  groupBy: 'Time of day' | 'Category' | 'None';
  todayLayout: 'List' | 'Grid';
  rowControl: 'Controls' | 'Fill row';
  recovery: 'Grace days' | 'Momentum';
  graceN: 0 | 1 | 2;
  weekStart: 'Monday' | 'Sunday';
  remindersOn: boolean;
  quietHours: boolean;
  smartTiming: boolean;
  routineReminders: boolean;
  eveningCatchUp: boolean;
  morningSummary: boolean;
  xpOn: boolean;
  achievementsOn: boolean;
  exportFormat: 'JSON' | 'CSV';
  exportNotes: boolean;
}

export interface TimerSession {
  habitId: string;
  date: DateKey;
  targetMin: number;
  accumulatedMs: number;
  startedAt: number | null; // null while paused
  done: boolean;
}

export interface Op {
  id: string;
  ts: number;
  op: string;
  payload: unknown;
}
