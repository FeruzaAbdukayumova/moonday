import { Image } from 'expo-image';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import type { Moment } from '@/lib/db';
import { formatClock } from '@/lib/day';
import { vibeFor } from '@/lib/vibes';
import { colors, fonts, radius, spacing, sticker } from '@/theme';

const TILE_COLORS = [colors.sky, colors.peach, colors.pinkLight, colors.mint, colors.lilac];

export function MomentRow({
  moment,
  index,
  last,
  onPress,
  onLongPress,
}: {
  moment: Moment;
  index: number;
  last: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const vibe = vibeFor(moment.vibe);

  return (
    <Pressable style={styles.row} onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.timeColumn}>
        <Text style={[styles.time, last && styles.timeLatest]}>
          {formatClock(moment.captured_at)}
        </Text>
        {!last && <View style={styles.spine} />}
      </View>
      <View style={styles.rowBody}>
        {moment.kind === 'text' ? (
          <View style={styles.textCard}>
            <Text style={styles.textCardText}>{moment.text}</Text>
          </View>
        ) : (
          <MomentPreview moment={moment} tint={TILE_COLORS[index % TILE_COLORS.length]} />
        )}
        {vibe && (
          <View style={[styles.vibe, { backgroundColor: vibe.color }]}>
            <Text style={styles.vibeText}>{`${vibe.emoji} ${vibe.label}`}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function MomentPreview({ moment, tint }: { moment: Moment; tint: string }) {
  const [thumbnail, setThumbnail] = useState<string | null>(
    moment.kind === 'photo' ? moment.uri : null
  );

  useEffect(() => {
    if (moment.kind !== 'video' || !moment.uri) return;

    let active = true;
    VideoThumbnails.getThumbnailAsync(moment.uri, { time: 300 })
      .then((result) => {
        if (active) setThumbnail(result.uri);
      })
      .catch(() => {
        // Thumbnail failures are cosmetic; the tinted tile stays.
      });

    return () => {
      active = false;
    };
  }, [moment.kind, moment.uri]);

  return (
    <View style={[styles.tile, { backgroundColor: tint }]}>
      {thumbnail && <Image source={{ uri: thumbnail }} style={styles.tileImage} contentFit="cover" />}
      {moment.kind === 'video' && (
        <View style={styles.playBadge}>
          <Icon name="play" size={16} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 60 },
  timeColumn: { width: 58, alignItems: 'center' },
  time: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeLatest: { backgroundColor: colors.pink },
  spine: { flex: 1, width: 3, borderRadius: 2, backgroundColor: colors.ink, marginVertical: 6 },
  rowBody: { flex: 1, paddingBottom: spacing.md, alignItems: 'flex-start', gap: 8 },

  textCard: {
    ...sticker(4),
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    transform: [{ rotate: '-1deg' }],
  },
  textCardText: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, color: colors.ink },

  tile: {
    width: 150,
    height: 200,
    borderRadius: radius.md,
    borderWidth: 2.5,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  tileImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  playBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibe: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.ink,
    justifyContent: 'center',
  },
  vibeText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
});
