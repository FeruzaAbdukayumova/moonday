import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Moon, moodForMoments } from '@/components/moon';
import { Bubble, Button } from '@/components/ui';
import { addMoment, momentsForDay, removeMoment, type Moment } from '@/lib/db';
import { dayKey, exifCapturedAt, formatClock, formatMonthDay, formatWeekday } from '@/lib/day';
import { deleteMedia, persistMedia } from '@/lib/media';
import { MOMENTS_FOR_FULL_MOON, colors, fonts, radius, spacing, sticker } from '@/theme';

/** When the day's film is due. Scheduling it for real comes later. */
const FILM_HOUR = 22;

const TILE_COLORS = [colors.sky, colors.peach, colors.pinkLight, colors.mint, colors.lilac];

export default function TodayScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moments, setMoments] = useState<Moment[]>([]);
  const today = dayKey();

  const load = useCallback(async () => {
    setMoments(await momentsForDay(db, today));
  }, [db, today]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function importFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      exif: true,
    });
    if (result.canceled) return;

    for (const asset of result.assets) {
      const kind = asset.type === 'video' ? 'video' : 'photo';
      const uri = await persistMedia(asset.uri, kind);
      await addMoment(db, {
        kind,
        uri,
        capturedAt: exifCapturedAt(asset.exif) ?? Date.now(),
      });
    }
    load();
  }

  function confirmDelete(moment: Moment) {
    Alert.alert('Delete this moment?', formatClock(moment.captured_at), [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeMoment(db, moment.id);
          deleteMedia(moment.uri);
          load();
        },
      },
    ]);
  }

  const openFilm = () => router.push({ pathname: '/film', params: { day: today } });

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={moments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={styles.weekday}>{formatWeekday(today)}</Text>
                <Text style={styles.date}>{formatMonthDay(today)}</Text>
              </View>
              {moments.length > 0 && <MoonCard count={moments.length} onFilm={openFilm} />}
            </>
          }
          ListEmptyComponent={<EmptyDay />}
          renderItem={({ item, index }) => (
            <MomentRow
              moment={item}
              tint={TILE_COLORS[index % TILE_COLORS.length]}
              last={index === moments.length - 1}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      </SafeAreaView>

      <View style={[styles.dock, { bottom: 14 + insets.bottom }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Write a line"
          style={styles.dockSide}
          onPress={() => router.push('/moment-text')}>
          <Icon name="text" size={24} color={colors.bg} />
          <Text style={styles.dockLabel}>Write</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture a moment"
          style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
          onPress={() => router.push('/capture?mode=video')}>
          <Icon name="camera" size={32} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add from gallery"
          style={styles.dockSide}
          onPress={importFromGallery}>
          <Icon name="image" size={24} color={colors.bg} />
          <Text style={styles.dockLabel}>Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyDay() {
  return (
    <View style={styles.empty}>
      <Bubble tilt={-2} style={styles.emptyBubble}>
        {'Today is still empty...\nlike my fridge.'}
      </Bubble>
      <Moon mood="crescent" size={170} />
      <MoonMeter count={0} />
      <Text style={styles.emptyHint}>
        {`${MOMENTS_FOR_FULL_MOON} moments and your film is ready at 10 PM`}
      </Text>
    </View>
  );
}

function MoonCard({ count, onFilm }: { count: number; onFilm: () => void }) {
  const full = count >= MOMENTS_FOR_FULL_MOON;

  return (
    <View style={styles.moonCard}>
      <View style={styles.moonCardRow}>
        <Moon mood={moodForMoments(count)} size={62} />
        <View style={styles.moonCardText}>
          <Text style={styles.moonCardTitle}>
            {full ? 'Full moon!' : 'Half a moon...'} {count} {count === 1 ? 'moment' : 'moments'}
          </Text>
          <MoonMeter count={count} />
          <Text style={styles.moonCardHint}>{filmCountdown()}</Text>
        </View>
      </View>
      <Button
        label={full ? "Make today's film" : 'Make the film now'}
        tone={full ? 'pink' : 'white'}
        size="medium"
        icon={<Icon name="film" size={20} />}
        onPress={onFilm}
      />
    </View>
  );
}

function MoonMeter({ count }: { count: number }) {
  const filled = Math.min(count / MOMENTS_FOR_FULL_MOON, 1);
  return (
    <View style={styles.meter}>
      <View style={[styles.meterFill, { width: `${Math.max(filled * 100, 4)}%` }]} />
    </View>
  );
}

function filmCountdown(): string {
  const now = new Date();
  if (now.getHours() >= FILM_HOUR || now.getHours() < 4) return "It's film time";

  const due = new Date(now);
  due.setHours(FILM_HOUR, 0, 0, 0);
  const minutes = Math.round((due.getTime() - now.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  return `Film at 10 PM · ${hours > 0 ? `${hours}h ` : ''}${minutes % 60}m left`;
}

function MomentRow({
  moment,
  tint,
  last,
  onLongPress,
}: {
  moment: Moment;
  tint: string;
  last: boolean;
  onLongPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onLongPress={onLongPress}>
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
          <MomentPreview moment={moment} tint={tint} />
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
  screen: { flex: 1, backgroundColor: colors.bg },
  safeArea: { flex: 1 },
  list: { paddingHorizontal: 22, paddingBottom: 140, flexGrow: 1 },
  header: { paddingTop: spacing.md, paddingBottom: spacing.md },
  weekday: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  date: { fontFamily: fonts.display, fontSize: 32, color: colors.ink, letterSpacing: -0.6 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 40 },
  emptyBubble: { maxWidth: 280 },
  emptyHint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, width: 260, textAlign: 'center' },

  moonCard: {
    ...sticker(4),
    backgroundColor: colors.lilac,
    borderRadius: radius.lg,
    padding: 14,
    gap: 12,
    marginBottom: spacing.lg,
  },
  moonCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moonCardText: { flex: 1, gap: 6 },
  moonCardTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  moonCardHint: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },

  meter: {
    width: '100%',
    maxWidth: 260,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: colors.butter },

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
  rowBody: { flex: 1, paddingBottom: spacing.md },

  textCard: {
    ...sticker(4),
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

  dock: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.ink,
    borderRadius: 28,
    minHeight: 74,
  },
  dockSide: { alignItems: 'center', gap: 3, width: 72, paddingVertical: 10 },
  dockLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.bg },
  shutter: {
    width: 72,
    height: 72,
    marginTop: -36,
    borderRadius: 36,
    backgroundColor: colors.pink,
    borderWidth: 3,
    borderColor: colors.ink,
    boxShadow: `0 5px 0 ${colors.ink}`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { transform: [{ translateY: 3 }], boxShadow: `0 2px 0 ${colors.ink}` },
});
