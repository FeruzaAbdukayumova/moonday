import * as ImagePicker from 'expo-image-picker';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Moon, moodForMoments } from '@/components/moon';
import { ShotIdeas } from '@/components/shot-ideas';
import { MomentRow } from '@/components/timeline';
import { Bubble, Button } from '@/components/ui';
import { VibeSheet } from '@/components/vibe-picker';
import {
  addMoment,
  dayPlanFor,
  daySummaries,
  momentsForDay,
  removeMoment,
  setDayPlan,
  setVibe,
  type Moment,
} from '@/lib/db';
import {
  DAY_START_HOUR,
  dayKey,
  exifCapturedAt,
  formatClock,
  formatHour,
  formatMonthDay,
  formatWeekday,
  streak,
} from '@/lib/day';
import { deleteMedia, persistMedia } from '@/lib/media';
import { scheduleReminders } from '@/lib/notify';
import { useSettings } from '@/lib/settings';
import { MOMENTS_FOR_FULL_MOON, colors, fonts, radius, spacing, sticker } from '@/theme';

export default function TodayScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [selected, setSelected] = useState<Moment | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const today = dayKey();

  const load = useCallback(async () => {
    const [todays, days, todaysPlan] = await Promise.all([
      momentsForDay(db, today),
      daySummaries(db),
      dayPlanFor(db, today),
    ]);
    setMoments(todays);
    setPlan(todaysPlan);
    setStreakDays(streak(new Set(days.map((d) => d.day)), today));
    return todays;
  }, [db, today]);

  useFocusEffect(
    useCallback(() => {
      if (!settings.onboarded) return;
      load().then((todays) => scheduleReminders(settings.filmHour, todays.length > 0));
    }, [load, settings.onboarded, settings.filmHour])
  );

  if (!settings.onboarded) return <Redirect href="/welcome" />;

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
          setSelected(null);
          await removeMoment(db, moment.id);
          deleteMedia(moment.uri);
          load();
        },
      },
    ]);
  }

  async function changeVibe(vibe: string | null) {
    if (!selected) return;
    await setVibe(db, selected.id, vibe);
    setSelected(null);
    load();
  }

  async function pickPlan(next: string | null) {
    setPlan(next);
    await setDayPlan(db, today, next);
  }

  const doneShots = new Set(moments.flatMap((m) => (m.shot ? [m.shot] : [])));

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
                <View style={styles.headerText}>
                  <Text style={styles.weekday}>
                    {settings.name ? `Hey ${settings.name} · ${formatWeekday(today)}` : formatWeekday(today)}
                  </Text>
                  <Text style={styles.date}>{formatMonthDay(today)}</Text>
                </View>
                {streakDays > 1 && (
                  <View style={styles.streak}>
                    <Text style={styles.streakText}>{`🔥 ${streakDays}`}</Text>
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Memories"
                  onPress={() => router.push('/memories')}
                  style={styles.headerButton}>
                  <Icon name="calendar" size={22} />
                </Pressable>
              </View>
              {moments.length > 0 && (
                <MoonCard count={moments.length} filmHour={settings.filmHour} onFilm={openFilm} />
              )}
              <ShotIdeas
                day={today}
                plan={plan}
                doneShots={doneShots}
                onPickPlan={pickPlan}
                onShoot={(shot) => router.push({ pathname: '/capture', params: { mode: 'video', shot } })}
              />
            </>
          }
          ListEmptyComponent={<EmptyDay filmHour={settings.filmHour} />}
          renderItem={({ item, index }) => (
            <MomentRow
              moment={item}
              index={index}
              last={index === moments.length - 1}
              onPress={() => setSelected(item)}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      </SafeAreaView>

      <VibeSheet
        visible={selected !== null}
        value={selected?.vibe ?? null}
        onChange={changeVibe}
        onClose={() => setSelected(null)}
        onDelete={selected ? () => confirmDelete(selected) : undefined}
      />

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

function EmptyDay({ filmHour }: { filmHour: number }) {
  return (
    <View style={styles.empty}>
      <Bubble tilt={-2} style={styles.emptyBubble}>
        {'Today is still empty...\nlike my fridge.'}
      </Bubble>
      <Moon mood="crescent" size={170} />
      <MoonMeter count={0} />
      <Text style={styles.emptyHint}>
        {`${MOMENTS_FOR_FULL_MOON} moments and your film is ready at ${formatHour(filmHour)}`}
      </Text>
    </View>
  );
}

function MoonCard({
  count,
  filmHour,
  onFilm,
}: {
  count: number;
  filmHour: number;
  onFilm: () => void;
}) {
  const full = count >= MOMENTS_FOR_FULL_MOON;
  const filmTime = isFilmTime(filmHour);

  if (filmTime) {
    return (
      <Pressable accessibilityRole="button" onPress={onFilm} style={styles.revealCard}>
        <Moon mood="wow" size={72} glow />
        <View style={styles.moonCardText}>
          <Text style={styles.revealTitle}>Full moon! Your film is ready</Text>
          <Text style={styles.revealHint}>{`${count} ${count === 1 ? 'moment' : 'moments'} · tap to watch`}</Text>
        </View>
        <Icon name="play" size={26} color={colors.butter} />
      </Pressable>
    );
  }

  return (
    <View style={styles.moonCard}>
      <View style={styles.moonCardRow}>
        <Moon mood={moodForMoments(count)} size={62} />
        <View style={styles.moonCardText}>
          <Text style={styles.moonCardTitle}>
            {full ? 'Full moon!' : 'Half a moon...'} {count} {count === 1 ? 'moment' : 'moments'}
          </Text>
          <MoonMeter count={count} />
          <Text style={styles.moonCardHint}>{filmCountdown(filmHour)}</Text>
        </View>
      </View>
      <Button
        label="Peek at the film now"
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

function isFilmTime(filmHour: number): boolean {
  const hour = new Date().getHours();
  return hour >= filmHour || hour < DAY_START_HOUR;
}

function filmCountdown(filmHour: number): string {
  const now = new Date();
  const due = new Date(now);
  due.setHours(filmHour, 0, 0, 0);
  const minutes = Math.round((due.getTime() - now.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  return `Film at ${formatHour(filmHour)} · ${hours > 0 ? `${hours}h ` : ''}${minutes % 60}m left`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  safeArea: { flex: 1 },
  list: { paddingHorizontal: 22, paddingBottom: 140, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerText: { flex: 1 },
  headerButton: {
    ...sticker(3),
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streak: {
    ...sticker(3),
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.butter,
    justifyContent: 'center',
  },
  streakText: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  revealCard: {
    ...sticker(5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.night,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: spacing.lg,
  },
  revealTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.butter },
  revealHint: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.bg },
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
