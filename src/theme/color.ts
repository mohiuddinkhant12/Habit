// Small colour helpers standing in for CSS `color-mix(in srgb, …)`, which
// React Native has no equivalent for.

type RGB = [number, number, number];

function parse(hex: string): RGB {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
}

/** `color-mix(in srgb, a p, b)` — p is the share of `a`, 0..1. */
export function mix(a: string, b: string, p: number): string {
  const x = parse(a);
  const y = parse(b);
  return toHex([x[0] * p + y[0] * (1 - p), x[1] * p + y[1] * (1 - p), x[2] * p + y[2] * (1 - p)]);
}

/** `color-mix(in srgb, c p, transparent)` — the colour at alpha p. */
export function alpha(c: string, p: number): string {
  const [r, g, b] = parse(c);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(p * 1000) / 1000})`;
}
