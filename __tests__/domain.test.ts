import { describe, expect, it } from '@jest/globals';

import { STARTERS } from '../src/domain/catalog';
import { addDays, weekStartOf } from '../src/domain/dates';
import { habitFromStarter } from '../src/domain/factory';
import { computeInsights, habitDetail } from '../src/domain/insights';
import { goalView } from '../src/domain/goals';
import { sampleData } from '../src/domain/sample';
import { dayStat, statusOn, streakOf } from '../src/domain/status';
import type { Habit, Log } from '../src/domain/types';

const TODAY = '2026-09-25'; // a Friday
const opts = { graceN: 1, weekStart: 'Monday' as const };
const starter = (id: string) => STARTERS.find((s) => s.id === id)!;

function habit(id: string, created = addDays(TODAY, -60)): Habit {
  return habitFromStarter(starter(id), created);
}

/** Build a log from a string of codes ending today: d done, m missed, s skip, p partial. */
function logFor(h: Habit, codes: string): Log {
  const days: Log[string] = {};
  [...codes].forEach((c, i) => {
    const k = addDays(TODAY, i - codes.length + 1);
    if (c === 'd') days[k] = { v: h.type === 'bool' ? 1 : h.target };
    if (c === 'p') days[k] = { v: Math.ceil(h.target / 2) };
    if (c === 's') days[k] = { v: 0, skip: true };
    if (c === 'x') days[k] = { v: 0, slip: true };
  });
  return { [h.id]: days };
}

describe('statusOn', () => {
  it('reads done, partial, skipped, missed and not-yet', () => {
    const h = habit('water');
    const log = logFor(h, 'dpsm_');
    expect(statusOn(h, log, addDays(TODAY, -4), TODAY)).toBe('d');
    expect(statusOn(h, log, addDays(TODAY, -3), TODAY)).toBe('p');
    expect(statusOn(h, log, addDays(TODAY, -2), TODAY)).toBe('s');
    expect(statusOn(h, log, addDays(TODAY, -1), TODAY)).toBe('m');
    expect(statusOn(h, log, TODAY, TODAY)).toBe('n');
    expect(statusOn(h, log, addDays(TODAY, 1), TODAY)).toBe('f');
  });

  it('treats weekends as off days for weekday habits', () => {
    const h = habit('spanish');
    expect(statusOn(h, {}, '2026-09-20', TODAY)).toBe('o'); // Sunday
    expect(statusOn(h, {}, '2026-09-21', TODAY)).toBe('m'); // Monday
  });

  it('counts avoid habits as clean unless a slip is logged', () => {
    const h = habit('phone');
    const log = logFor(h, 'dx_');
    expect(statusOn(h, log, addDays(TODAY, -1), TODAY)).toBe('m');
    expect(statusOn(h, log, TODAY, TODAY)).toBe('d');
  });

  it('keeps the old schedule for days before an edit', () => {
    const h = habit('read');
    h.schedules.push({ from: addDays(TODAY, -2), s: { kind: 'weekdays' } });
    expect(statusOn(h, {}, '2026-09-20', TODAY)).toBe('m'); // Sunday, still daily then
    expect(statusOn(h, {}, addDays(TODAY, 1), addDays(TODAY, 2))).toBe('o'); // Saturday after the edit
  });
});

describe('streakOf', () => {
  it('counts today when done and holds on skipped days', () => {
    const h = habit('vitamins');
    expect(streakOf(h, logFor(h, 'ddsdd'), TODAY, opts).current).toBe(4);
  });

  it('does not break before today is checked in', () => {
    const h = habit('vitamins');
    expect(streakOf(h, logFor(h, 'ddd_'), TODAY, opts).current).toBe(3);
  });

  it('covers one missed day a week with a grace day', () => {
    const h = habit('vitamins');
    const s = streakOf(h, logFor(h, 'dddmd'), TODAY, opts);
    expect(s.current).toBe(4);
    expect(s.covered).toEqual([addDays(TODAY, -1)]);
    expect(s.graceLeft).toBe(0);
  });

  it('breaks on a second miss in the same week, or with grace off', () => {
    const h = habit('vitamins');
    expect(streakOf(h, logFor(h, 'ddmmd'), TODAY, opts).current).toBe(1);
    expect(streakOf({ ...h, grace: false }, logFor(h, 'dddmd'), TODAY, opts).current).toBe(1);
    expect(streakOf(h, logFor(h, 'dddmd'), TODAY, { ...opts, graceN: 0 }).current).toBe(1);
  });

  it('keeps the best streak on record after a break', () => {
    const h = habit('vitamins');
    expect(streakOf(h, logFor(h, 'dddddmmdd'), TODAY, opts).best).toBe(5);
  });

  it('counts weeks for frequency habits', () => {
    const h = habit('gym');
    const log: Log = { gym: {} };
    for (let w = 1; w <= 3; w++) {
      const ws = weekStartOf(addDays(TODAY, -7 * w));
      [0, 2, 4].forEach((d) => (log.gym[addDays(ws, d)] = { v: 1 }));
    }
    const s = streakOf(h, log, TODAY, opts);
    expect(s.unit).toBe('weeks');
    expect(s.current).toBe(3);
  });
});

describe('dayStat', () => {
  it('counts partial as half and ignores skipped days', () => {
    const a = habit('water');
    const b = habit('read');
    const log = { ...logFor(a, 'p'), ...logFor(b, 's') };
    expect(dayStat([a, b], log, TODAY, TODAY)).toEqual({ due: 1, done: 0.5 });
  });
});

describe('sample data', () => {
  const s = sampleData(TODAY);
  const by = (id: string) => s.habits.find((h) => h.id === id)!;

  it('ends each habit on the streak the story needs', () => {
    expect(streakOf(by('journal'), s.log, TODAY, opts).current).toBe(29);
    expect(streakOf(by('meditate'), s.log, TODAY, opts).current).toBe(12);
    // Read was missed yesterday; a grace day keeps its 8-day run going.
    const read = streakOf(by('read'), s.log, TODAY, opts);
    expect(read.current).toBe(8);
    expect(read.covered).toContain(addDays(TODAY, -1));
  });

  it('feeds goals to the numbers the design shows', () => {
    const g = s.goals.find((x) => x.id === 'books')!;
    expect(goalView(g, by('read'), s.log, TODAY).cur).toBeCloseTo(14, 0);
  });

  it('produces insights with a labelled correlation', () => {
    const act = s.habits.filter((h) => !h.archived);
    const ins = computeInsights(act, s.log, TODAY, 'Week', opts);
    expect(ins.logged).toBeGreaterThan(7);
    expect(ins.bars).toHaveLength(7);
    expect(ins.correlation).not.toBeNull();
    expect(ins.correlation!.withA).toBeGreaterThan(ins.correlation!.withoutA);
  });

  it('builds a 26-week heatmap for habit detail', () => {
    const d = habitDetail(by('meditate'), s.log, TODAY, opts);
    expect(d.cells).toHaveLength(182);
    expect(d.notes.length).toBeGreaterThan(1);
  });
});
