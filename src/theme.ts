import type { ViewStyle } from 'react-native';

/** Palette B, "cotton candy". Every surface is outlined in ink, like a sticker. */
export const colors = {
  bg: '#FDF7FB',
  ink: '#2F2A45',
  inkSoft: '#5A5470',
  card: '#FFFFFF',
  line: '#EFE8F3',
  pink: '#F4B3CB',
  pinkLight: '#F9D3E1',
  lilac: '#D6C8F2',
  sky: '#C4E1F6',
  mint: '#C8EEDC',
  butter: '#FFF0B8',
  peach: '#FFE6A8',
  unlit: '#E9E4F0',
  night: '#25213A',
  nightSoft: '#3C3654',
  danger: '#D9534F',
};

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 22,
  pill: 999,
};

/** The flat offset shadow that makes cards look like stickers. */
export function sticker(depth = 4): ViewStyle {
  return {
    borderWidth: 2.5,
    borderColor: colors.ink,
    boxShadow: `0 ${depth}px 0 ${colors.ink}`,
  };
}

/** Clips stay short on purpose: a moment, not a video. */
export const MAX_CLIP_SECONDS = 6;

/** Moments needed before the moon is full and the film is worth making. */
export const MOMENTS_FOR_FULL_MOON = 3;

/** Film times offered in onboarding and settings. */
export const FILM_HOURS = [20, 21, 22, 23];
