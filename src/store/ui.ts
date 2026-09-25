import { create } from 'zustand';

import type { DateKey } from '@/domain/types';
import type { Data } from './data';

export type Sheet =
  | { k: 'actions'; id: string }
  | { k: 'day'; date: DateKey }
  | { k: 'note'; id: string; date: DateKey }
  | { k: 'exported'; file: string; size: string; uri: string }
  | { k: 'restore' }
  | { k: 'restoreErr'; reason: string };

export type Dialog =
  | { k: 'archive'; id: string }
  | { k: 'delete'; id: string }
  | { k: 'restore'; file: string; uri: string };

export interface Snack {
  msg: string;
  undo?: Pick<Data, 'habits' | 'log' | 'xp'>;
  id: number;
}

export interface Milestone {
  n: number;
  name: string;
  longest: boolean;
  xp: boolean;
  unlocked: string | null;
}

interface UI {
  sheet: Sheet | null;
  dialog: Dialog | null;
  snack: Snack | null;
  milestone: Milestone | null;
  openSheet: (s: Sheet | null) => void;
  openDialog: (d: Dialog | null) => void;
  toast: (msg: string, undo?: Snack['undo']) => void;
  clearSnack: () => void;
  showMilestone: (m: Milestone | null) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useUI = create<UI>()((set) => ({
  sheet: null,
  dialog: null,
  snack: null,
  milestone: null,
  openSheet: (sheet) => set({ sheet, dialog: null }),
  openDialog: (dialog) => set({ dialog, sheet: null }),
  toast: (msg, undo) => {
    clearTimeout(timer);
    set({ snack: { msg, undo, id: Date.now() } });
    timer = setTimeout(() => set({ snack: null }), 4500);
  },
  clearSnack: () => {
    clearTimeout(timer);
    set({ snack: null });
  },
  showMilestone: (milestone) => set({ milestone }),
}));
