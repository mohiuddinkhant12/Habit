import { alpha, mix } from './color';
import { nocturne as N } from './tokens';

export type ThemeName = 'Dark' | 'Light';
export type AccentName = 'Blurple' | 'Lilac' | 'Slate';

/** Semantic palette — mirrors the prototype's `[data-hf]` custom properties. */
export interface Palette {
  name: ThemeName;
  bg: string;
  sf: string; // surface
  sf2: string; // raised track / inactive fill
  tx: string;
  mu: string; // muted text
  fa: string; // faint
  lbl: string; // section label
  ln: string; // hairline
  ln2: string; // rule / outline
  ac: string; // accent
  acx: string; // accent text on tint
  act: string; // accent tint
  acDeep: string; // gradient start (ramp 700)
  acMid: string; // checkbox gradient end (ramp 600)
  onac: string;
  bar: string; // ordinary chart bar (neutral 600)
  toast: string;
  cardTop: string; // --card gradient
  cardBottom: string;
  navBg: string;
  scrim: string;
  glow: string; // boxShadow
  glowSoft: string;
  shadowMd: string;
  shadowLg: string;
  heat: [string, string, string, string, string];
}

export function buildPalette(theme: ThemeName, accent: AccentName): Palette {
  const dark = theme === 'Dark';
  const bg = dark ? N.bg : N.neutral[100];
  const sf = dark ? N.surface : N.neutral[200];
  const tx = dark ? N.text : N.neutral[900];

  const ramps = {
    Blurple: { base: N.accent, r: N.accentRamp },
    Lilac: { base: N.accent2, r: N.accent2Ramp },
    Slate: { base: N.neutral[400], r: N.neutral },
  }[accent];
  const r = ramps.r;
  const ac = dark ? (accent === 'Slate' ? N.neutral[400] : ramps.base) : r[600];
  const acx = dark ? (accent === 'Slate' ? N.neutral[200] : r[300]) : accent === 'Slate' ? N.neutral[800] : r[700];
  const act = dark ? (accent === 'Slate' ? N.neutral[800] : r[900]) : accent === 'Slate' ? N.neutral[300] : r[200];

  return {
    name: theme,
    bg,
    sf,
    sf2: dark ? N.neutral[800] : N.neutral[300],
    tx,
    mu: dark ? N.neutral[400] : N.neutral[700],
    fa: N.neutral[600],
    lbl: dark ? N.neutral[500] : N.neutral[700],
    ln: alpha(tx, 0.1),
    ln2: alpha(tx, 0.2),
    ac,
    acx,
    act,
    acDeep: r[700],
    acMid: r[600],
    onac: dark ? N.bg : N.neutral[100],
    bar: N.neutral[600],
    toast: dark ? N.neutral[800] : N.neutral[200],
    cardTop: sf,
    cardBottom: mix(sf, bg, 0.55),
    navBg: mix(sf, bg, 0.6),
    scrim: alpha(N.ink, 0.45),
    glow: `0px 0px 14px ${alpha(ac, dark ? 0.45 : 0.25)}`,
    glowSoft: `0px 0px 8px ${alpha(ac, 0.5)}`,
    shadowMd: dark
      ? `0px 0px 0px 1px ${N.neutral[700]}, 0px 6px 18px rgba(0, 0, 0, 0.55)`
      : `0px 2px 10px ${alpha(N.neutral[900], 0.12)}`,
    shadowLg: dark
      ? `0px 0px 0px 1px ${N.neutral[500]}, 0px 16px 40px rgba(0, 0, 0, 0.65)`
      : `0px 8px 30px ${alpha(N.neutral[900], 0.18)}`,
    heat: [sf, mix(ac, bg, 0.22), mix(ac, bg, 0.45), mix(ac, bg, 0.72), ac],
  };
}
