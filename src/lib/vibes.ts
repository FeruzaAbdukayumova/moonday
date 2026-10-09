import { colors } from '@/theme';

/** One tap to say how a moment felt. The film shows the label next to the time. */
export const VIBES = [
  { key: 'cozy', emoji: '🥰', label: 'cozy', color: colors.pinkLight },
  { key: 'lol', emoji: '😂', label: 'lol', color: colors.butter },
  { key: 'chill', emoji: '😌', label: 'chill', color: colors.mint },
  { key: 'hype', emoji: '🔥', label: 'hype', color: colors.peach },
  { key: 'meh', emoji: '🫠', label: 'meh', color: colors.sky },
  { key: 'yum', emoji: '😋', label: 'yum', color: colors.lilac },
] as const;

export type VibeKey = (typeof VIBES)[number]['key'];

export function vibeFor(key: string | null | undefined) {
  return VIBES.find((v) => v.key === key) ?? null;
}
