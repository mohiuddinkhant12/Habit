import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useData } from '@/store/data';
import { buildPalette, type Palette, type ThemeName } from './palette';

export interface Theme {
  p: Palette;
  /** Row padding — the density setting. */
  rp: number;
  /** Base and long animation durations; zero when motion is reduced. */
  t: number;
  t2: number;
  reduceMotion: boolean;
}

const Ctx = createContext<Theme | null>(null);

export function useThemeName(): ThemeName {
  const pref = useData((s) => s.settings.theme);
  const system = useColorScheme();
  return pref === 'System' ? (system === 'light' ? 'Light' : 'Dark') : pref;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const name = useThemeName();
  const accent = useData((s) => s.settings.accent);
  const density = useData((s) => s.settings.density);
  const reduceMotion = useData((s) => s.settings.reduceMotion);
  const value = useMemo<Theme>(
    () => ({ p: buildPalette(name, accent), rp: density === 'Compact' ? 6 : 10, t: reduceMotion ? 0 : 160, t2: reduceMotion ? 0 : 240, reduceMotion }),
    [name, accent, density, reduceMotion],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): Theme {
  const t = useContext(Ctx);
  if (!t) throw new Error('useT outside ThemeProvider');
  return t;
}
