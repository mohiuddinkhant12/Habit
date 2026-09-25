import type { Category, HabitType, TimeOfDay } from './types';

export const TYPE_LABEL: Record<HabitType, string> = { bool: 'Yes / No', qty: 'Amount', dur: 'Timed', avoid: 'Avoid' };

export const TIMES: TimeOfDay[] = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
export const CATS: Category[] = ['Health', 'Mind', 'Learning', 'Fitness', 'Sleep', 'Spiritual', 'Work', 'Money'];
export const ICONS = ['check', 'drop', 'book-open', 'barbell', 'sneaker-move', 'flower-lotus', 'pill', 'notebook', 'translate', 'moon', 'sun', 'hand-heart'];

/** Starter habits offered in onboarding and as templates. */
export interface Starter {
  id: string;
  name: string;
  icon: string;
  type: HabitType;
  target?: number;
  unit?: string;
  time: TimeOfDay;
  cat: Category;
  sched: 'daily' | 'weekdays' | 'perWeek';
  perWeek?: number;
  reminder?: string;
  est: number;
}

export const STARTERS: Starter[] = [
  { id: 'vitamins', name: 'Take vitamins', icon: 'pill', type: 'bool', time: 'Morning', cat: 'Health', sched: 'daily', reminder: '07:30', est: 1 },
  { id: 'stretch', name: 'Stretch', icon: 'person-simple', type: 'bool', time: 'Morning', cat: 'Fitness', sched: 'daily', reminder: '07:00', est: 5 },
  { id: 'meditate', name: 'Meditate', icon: 'flower-lotus', type: 'dur', target: 10, unit: 'min', time: 'Morning', cat: 'Mind', sched: 'daily', reminder: '07:15', est: 10 },
  { id: 'water', name: 'Drink water', icon: 'drop', type: 'qty', target: 8, unit: 'glasses', time: 'Anytime', cat: 'Health', sched: 'daily', est: 1 },
  { id: 'walk', name: 'Walk', icon: 'sneaker-move', type: 'qty', target: 8000, unit: 'steps', time: 'Afternoon', cat: 'Fitness', sched: 'daily', est: 30 },
  { id: 'spanish', name: 'Spanish practice', icon: 'translate', type: 'dur', target: 20, unit: 'min', time: 'Afternoon', cat: 'Learning', sched: 'weekdays', reminder: '13:00', est: 20 },
  { id: 'gym', name: 'Strength training', icon: 'barbell', type: 'bool', time: 'Anytime', cat: 'Fitness', sched: 'perWeek', perWeek: 3, est: 45 },
  { id: 'read', name: 'Read', icon: 'book-open', type: 'qty', target: 20, unit: 'pages', time: 'Evening', cat: 'Learning', sched: 'daily', reminder: '21:30', est: 25 },
  { id: 'journal', name: 'Journal', icon: 'notebook', type: 'bool', time: 'Evening', cat: 'Mind', sched: 'daily', reminder: '22:00', est: 8 },
  { id: 'phone', name: 'No phone after 22:00', icon: 'device-mobile', type: 'avoid', time: 'Evening', cat: 'Sleep', sched: 'daily', est: 1 },
  { id: 'pray', name: 'Pray', icon: 'hand-heart', type: 'bool', time: 'Morning', cat: 'Spiritual', sched: 'daily', est: 10 },
  { id: 'deep', name: 'Deep work', icon: 'briefcase', type: 'dur', target: 60, unit: 'min', time: 'Morning', cat: 'Work', sched: 'weekdays', est: 60 },
  { id: 'spend', name: 'Log expenses', icon: 'wallet', type: 'bool', time: 'Evening', cat: 'Money', sched: 'daily', est: 3 },
];

export const AREAS: { area: Category; icon: string; ids: string[] }[] = [
  { area: 'Health', icon: 'heartbeat', ids: ['water', 'vitamins'] },
  { area: 'Mind', icon: 'brain', ids: ['meditate', 'journal'] },
  { area: 'Learning', icon: 'book-open', ids: ['read', 'spanish'] },
  { area: 'Fitness', icon: 'barbell', ids: ['walk', 'stretch', 'gym'] },
  { area: 'Sleep', icon: 'moon', ids: ['phone'] },
  { area: 'Spiritual', icon: 'hand-heart', ids: ['pray'] },
  { area: 'Work', icon: 'briefcase', ids: ['deep'] },
  { area: 'Money', icon: 'wallet', ids: ['spend'] },
];

export const TEMPLATES: { name: string; icon: string; type: HabitType; target?: number; unit?: string; dur?: number; time: TimeOfDay; cat: Category }[] = [
  { name: 'Drink water', icon: 'drop', type: 'qty', target: 8, unit: 'glasses', time: 'Anytime', cat: 'Health' },
  { name: 'Meditate', icon: 'flower-lotus', type: 'dur', dur: 10, time: 'Morning', cat: 'Mind' },
  { name: 'Read', icon: 'book-open', type: 'qty', target: 20, unit: 'pages', time: 'Evening', cat: 'Learning' },
  { name: 'No sugar', icon: 'shield-check', type: 'avoid', time: 'Anytime', cat: 'Health' },
  { name: 'Walk', icon: 'sneaker-move', type: 'qty', target: 8000, unit: 'steps', time: 'Afternoon', cat: 'Fitness' },
];

export function stepFor(target: number): number {
  return target >= 1000 ? 1000 : target >= 20 ? 5 : 1;
}

export const XP_PER_CHECKIN = 10;
export const XP_PER_LEVEL = 200;
export const XP_MILESTONE_BONUS = 100;
export const MILESTONES = [7, 30, 50, 100];
