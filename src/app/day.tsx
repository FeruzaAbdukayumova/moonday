import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { MomentRow } from '@/components/timeline';
import { Button } from '@/components/ui';
import { VibeSheet } from '@/components/vibe-picker';
import { filmForDay, momentsForDay, setVibe, type Moment } from '@/lib/db';
import { dayKey, formatMonthDay, formatWeekday } from '@/lib/day';
import { colors, fonts, spacing, sticker } from '@/theme';

/** A past day, read back: its timeline and its film. */
export default function DayScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = params.day ?? dayKey();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [hasFilm, setHasFilm] = useState(false);
  const [selected, setSelected] = useState<Moment | null>(null);

  const load = useCallback(async () => {
    const [list, film] = await Promise.all([momentsForDay(db, day), filmForDay(db, day)]);
    setMoments(list);
    setHasFilm(film !== null);
  }, [db, day]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function changeVibe(vibe: string | null) {
    if (!selected) return;
    await setVibe(db, selected.id, vibe);
    setSelected(null);
    load();
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.round}>
            <Icon name="back" size={22} />
          </Pressable>
          <View>
            <Text style={styles.weekday}>{formatWeekday(day)}</Text>
            <Text style={styles.date}>{formatMonthDay(day)}</Text>
          </View>
        </View>

        <FlatList
          data={moments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 110 + insets.bottom }]}
          renderItem={({ item, index }) => (
            <MomentRow
              moment={item}
              index={index}
              last={index === moments.length - 1}
              onPress={() => setSelected(item)}
            />
          )}
        />
      </SafeAreaView>

      {moments.length > 0 && (
        <View style={[styles.footer, { bottom: 16 + insets.bottom }]}>
          <Button
            label={hasFilm ? 'Watch the film' : 'Make the film'}
            icon={<Icon name="film" size={22} />}
            onPress={() => router.push({ pathname: '/film', params: { day } })}
          />
        </View>
      )}

      <VibeSheet
        visible={selected !== null}
        value={selected?.vibe ?? null}
        onChange={changeVibe}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  round: {
    ...sticker(3),
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekday: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  date: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, letterSpacing: -0.5 },
  list: { paddingHorizontal: 22 },
  footer: { position: 'absolute', left: 22, right: 22 },
});
