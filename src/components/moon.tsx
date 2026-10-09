import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

import { colors, MOMENTS_FOR_FULL_MOON } from '@/theme';

export type MoonMood = 'crescent' | 'half' | 'full' | 'wow' | 'wink' | 'cool' | 'party';

const INK = colors.ink;
const LIT = colors.butter;

/** The moon fills up as the day gets moments. */
export function moodForMoments(count: number): MoonMood {
  if (count === 0) return 'crescent';
  if (count < MOMENTS_FOR_FULL_MOON) return 'half';
  return 'full';
}

/**
 * Moonie, the mascot. Drawn in a 120-unit box; `glow` adds sparkles above it
 * and `party` a hat, both of which make the drawing taller than it is wide.
 */
export function Moon({
  mood = 'full',
  size = 120,
  glow = false,
}: {
  mood?: MoonMood;
  size?: number;
  glow?: boolean;
}) {
  const top = glow || mood === 'party' ? -26 : 0;
  const height = 120 - top;

  return (
    <Svg width={size} height={(size * height) / 120} viewBox={`0 ${top} 120 ${height}`}>
      {glow && (
        <G stroke={INK} strokeWidth={2} strokeLinejoin="round">
          <Path d="M22 0 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" fill={colors.lilac} />
          <Path d="M96 -14 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill={colors.pink} />
          <Circle cx={104} cy={18} r={3} fill={colors.sky} strokeWidth={1.8} />
        </G>
      )}

      <Ellipse cx={60} cy={113} rx={32} ry={4} fill={INK} opacity={0.1} />
      <Circle cx={60} cy={60} r={46} fill={colors.unlit} />
      {mood === 'crescent' && <Path d="M60 14 a46 46 0 0 0 0 92 a30 46 0 0 1 0 -92z" fill={LIT} />}
      {mood === 'half' && <Path d="M60 14 a46 46 0 0 0 0 92z" fill={LIT} />}
      {mood !== 'crescent' && mood !== 'half' && (
        <G>
          <Circle cx={60} cy={60} r={46} fill={LIT} />
          <Circle cx={86} cy={36} r={6} fill="#F5E29E" />
          <Circle cx={30} cy={86} r={5} fill="#F5E29E" />
          <Circle cx={86} cy={88} r={3.5} fill="#F5E29E" />
        </G>
      )}
      <Circle cx={60} cy={60} r={46} fill="none" stroke={INK} strokeWidth={3.5} />

      {mood === 'party' && (
        <G>
          <Path d="M44 20 L60 -22 L76 20z" fill={colors.pink} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M50 4 l10 -4 M47 12 l18 -6" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
          <Circle cx={60} cy={-22} r={5} fill={colors.sky} stroke={INK} strokeWidth={2.5} />
        </G>
      )}

      <Face mood={mood} />
    </Svg>
  );
}

function Eye({ x }: { x: number }) {
  return (
    <G>
      <Circle cx={x} cy={58} r={4.5} fill={INK} />
      <Circle cx={x + 1.5} cy={56.5} r={1.4} fill="#fff" />
    </G>
  );
}

function Cheeks() {
  return (
    <G fill={colors.pink}>
      <Ellipse cx={40} cy={69} rx={6} ry={3.5} />
      <Ellipse cx={80} cy={69} rx={6} ry={3.5} />
    </G>
  );
}

const stroke = { fill: 'none', stroke: INK, strokeWidth: 3, strokeLinecap: 'round' } as const;

function Smile() {
  return <Path d="M53 69 Q60 77 67 69" {...stroke} />;
}

function Face({ mood }: { mood: MoonMood }) {
  switch (mood) {
    case 'crescent':
      return (
        <G>
          <Path d="M42 60 Q48 64 54 60 M66 60 Q72 64 78 60" {...stroke} />
          <Circle cx={60} cy={73} r={3} fill={INK} />
          <SvgText x={90} y={30} fontSize={16} fontWeight="800" fill={INK}>z</SvgText>
          <SvgText x={100} y={18} fontSize={12} fontWeight="800" fill={INK}>z</SvgText>
        </G>
      );
    case 'half':
      return (
        <G>
          <Eye x={48} />
          <Eye x={72} />
          <Path d="M53 71 Q60 74 67 71" {...stroke} />
        </G>
      );
    case 'wow':
      return (
        <G>
          <Circle cx={48} cy={56} r={6.5} fill="#fff" stroke={INK} strokeWidth={3} />
          <Circle cx={72} cy={56} r={6.5} fill="#fff" stroke={INK} strokeWidth={3} />
          <Circle cx={48} cy={57} r={2.6} fill={INK} />
          <Circle cx={72} cy={57} r={2.6} fill={INK} />
          <Ellipse cx={60} cy={75} rx={5} ry={6} fill={INK} />
          <Cheeks />
        </G>
      );
    case 'wink':
      return (
        <G>
          <Eye x={48} />
          <Path d="M66 59 Q72 54 78 59" {...stroke} />
          <Cheeks />
          <Smile />
        </G>
      );
    case 'cool':
      return (
        <G>
          <Path
            d="M36 52h48v4c0 6-4 10-10 10h-3c-5 0-8-4-9-8-1 4-4 8-9 8h-3c-6 0-10-4-10-10z"
            fill={INK}
          />
          <Smile />
        </G>
      );
    case 'party':
      return (
        <G>
          <Path d="M42 60 Q48 54 54 60 M66 60 Q72 54 78 60" {...stroke} />
          <Path d="M52 70 Q60 80 68 70z" fill={INK} />
          <Cheeks />
        </G>
      );
    default:
      return (
        <G>
          <Eye x={48} />
          <Eye x={72} />
          <Cheeks />
          <Smile />
        </G>
      );
  }
}
