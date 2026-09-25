import { describe, expect, it } from '@jest/globals';

import { STARTERS } from '../src/domain/catalog';
import { habitFromStarter } from '../src/domain/factory';
import { EMPTY_PROFILE, merge, type SyncPayload } from '../src/domain/merge';

const habit = (id: string, updatedAt = 0) => ({ ...habitFromStarter(STARTERS.find((s) => s.id === id)!, '2026-09-01'), updatedAt });

function payload(p: Partial<SyncPayload>): SyncPayload {
  return { onboarded: true, habits: [], log: {}, routines: [], runs: [], goals: [], reviews: {}, xp: 0, profile: EMPTY_PROFILE, deleted: {}, ...p };
}

describe('merge', () => {
  it('combines habits and check-ins from both devices', () => {
    const local = payload({ habits: [habit('read')], log: { read: { '2026-09-24': { v: 20, u: 1 } } } });
    const remote = payload({ habits: [habit('read'), habit('walk')], log: { read: { '2026-09-23': { v: 20, u: 1 } }, walk: { '2026-09-23': { v: 8000, u: 1 } } } });
    const m = merge(local, remote);
    expect(m.habits.map((h) => h.id)).toEqual(['read', 'walk']);
    expect(Object.keys(m.log.read).sort()).toEqual(['2026-09-23', '2026-09-24']);
    expect(m.log.walk['2026-09-23'].v).toBe(8000);
  });

  it('keeps the newer edit when the same day changed on both', () => {
    const local = payload({ habits: [habit('water')], log: { water: { '2026-09-24': { v: 3, u: 100 } } } });
    const remote = payload({ habits: [habit('water')], log: { water: { '2026-09-24': { v: 8, u: 200 } } } });
    expect(merge(local, remote).log.water['2026-09-24'].v).toBe(8);
    expect(merge(remote, local).log.water['2026-09-24'].v).toBe(8);
  });

  it('keeps the newer version of an edited habit', () => {
    const renamed = { ...habit('read', 500), name: 'Read fiction' };
    expect(merge(payload({ habits: [habit('read', 100)] }), payload({ habits: [renamed] })).habits[0].name).toBe('Read fiction');
  });

  it('does not bring back a habit deleted on either side', () => {
    const local = payload({ habits: [], deleted: { read: 1000 } });
    const remote = payload({ habits: [habit('read', 10)], log: { read: { '2026-09-24': { v: 20 } } }, routines: [{ id: 'r', name: 'Night', time: '21:00', steps: ['read'] }] });
    const m = merge(local, remote);
    expect(m.habits).toHaveLength(0);
    expect(m.log.read).toBeUndefined();
    expect(m.routines[0].steps).toEqual([]);
  });

  it('keeps the higher XP and de-duplicates routine runs', () => {
    const run = { routineId: 'am', date: '2026-09-24', results: ['d' as const] };
    const m = merge(payload({ xp: 300, runs: [run] }), payload({ xp: 500, runs: [run] }));
    expect(m.xp).toBe(500);
    expect(m.runs).toHaveLength(1);
  });
});
