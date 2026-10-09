import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export type IconName = 'camera' | 'text' | 'image' | 'close' | 'flip' | 'play' | 'share' | 'film' | 'back';

/** Stroke icons drawn the same on iOS and Android. */
export function Icon({
  name,
  size = 24,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const stroke = {
    fill: 'none',
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'camera' && (
        <>
          <Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...stroke} />
          <Circle cx={12} cy={13} r={3.5} {...stroke} />
        </>
      )}
      {name === 'text' && <Path d="M5 6h14M12 6v13M9 19h6" {...stroke} />}
      {name === 'image' && (
        <>
          <Rect x={3.5} y={4.5} width={17} height={15} rx={3} {...stroke} />
          <Circle cx={9} cy={10} r={1.8} {...stroke} />
          <Path d="M20.5 16l-5-5-9 8.5" {...stroke} />
        </>
      )}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...stroke} />}
      {name === 'flip' && <Path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" {...stroke} />}
      {name === 'play' && <Path d="M8 5l11 7-11 7z" {...stroke} />}
      {name === 'share' && <Path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" {...stroke} />}
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...stroke} />}
      {name === 'film' && (
        <>
          <Rect x={3.5} y={3.5} width={17} height={17} rx={3} {...stroke} />
          <Path d="M8 3.5v17M16 3.5v17M3.5 9h4.5M3.5 15h4.5M16 9h4.5M16 15h4.5" {...stroke} />
        </>
      )}
    </Svg>
  );
}
