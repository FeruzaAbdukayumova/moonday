import { moodForMoments } from '@/components/moon';
import { VIBES, vibeFor } from '@/lib/vibes';
import { MOMENTS_FOR_FULL_MOON } from '@/theme';

describe('vibeFor', () => {
  it('finds a vibe by key', () => {
    expect(vibeFor('lol')?.emoji).toBe('😂');
  });

  it('returns null for no vibe or an unknown one', () => {
    expect(vibeFor(null)).toBeNull();
    expect(vibeFor('grumpy')).toBeNull();
  });

  it('has unique keys', () => {
    expect(new Set(VIBES.map((v) => v.key)).size).toBe(VIBES.length);
  });
});

describe('moodForMoments', () => {
  it('fills the moon as the day gets moments', () => {
    expect(moodForMoments(0)).toBe('crescent');
    expect(moodForMoments(1)).toBe('half');
    expect(moodForMoments(MOMENTS_FOR_FULL_MOON - 1)).toBe('half');
    expect(moodForMoments(MOMENTS_FOR_FULL_MOON)).toBe('full');
    expect(moodForMoments(40)).toBe('full');
  });
});
