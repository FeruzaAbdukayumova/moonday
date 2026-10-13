import { CHALLENGE_SHOT, challengeFor, DAY_PLANS, planFor, shotFor } from '@/lib/shots';

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('challengeFor', () => {
  it('gives everyone the same challenge on the same day', () => {
    expect(challengeFor('2026-10-13')).toEqual(challengeFor('2026-10-13'));
  });

  it('changes every day and only repeats after the whole list', () => {
    const start = '2026-10-13';
    const keys = Array.from({ length: 20 }, (_, i) => challengeFor(addDays(start, i)).key);
    expect(new Set(keys).size).toBe(20);
    expect(challengeFor(addDays(start, 20))).toEqual(challengeFor(start));
  });
});

describe('shot keys', () => {
  // Keys are stored on moments, so a duplicate would point an old moment at the wrong idea.
  it('are unique across all day plans', () => {
    const keys = DAY_PLANS.flatMap((p) => p.shots.map((s) => s.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain(CHALLENGE_SHOT);
  });

  it('give every plan five shots', () => {
    for (const plan of DAY_PLANS) expect(plan.shots).toHaveLength(5);
  });
});

describe('shotFor', () => {
  it('finds a plan shot by its key', () => {
    expect(shotFor('walk-3', '2026-10-13')?.what).toMatch(/tiny detail/);
  });

  it('resolves the challenge for the moment day, not today', () => {
    expect(shotFor(CHALLENGE_SHOT, '2026-01-02')).toEqual(challengeFor('2026-01-02'));
  });

  it('returns null for unknown or empty keys', () => {
    expect(shotFor('gone-1', '2026-10-13')).toBeNull();
    expect(shotFor(null, '2026-10-13')).toBeNull();
  });
});

describe('planFor', () => {
  it('looks plans up by key', () => {
    expect(planFor('cozy')?.label).toBe('Cozy day');
    expect(planFor('nope')).toBeNull();
    expect(planFor(undefined)).toBeNull();
  });
});
