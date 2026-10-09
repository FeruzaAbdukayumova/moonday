import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Moon, moodForMoments } from '@/components/moon';
import { daySummaries, type DaySummary } from '@/lib/db';
import { dayKey, monthGrid, monthName, streak } from '@/lib/day';
import { colors, fonts, radius, spacing, sticker } from '@/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function MemoriesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const today = dayKey();
  const [days, setDays] = useState<DaySummary[]>([]);
  const [month, setMonth] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  useFocusEffect(
    useCallback(() => {
      daySummaries(db).then(setDays);
    }, [db])
  );

  const byDay = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);
  const stats = useMemo(
    () => ({
      streak: streak(new Set(byDay.keys()), today),
      days: days.length,
      moments: days.reduce((sum, d) => sum + d.count, 0),
      films: days.filter((d) => d.has_film).length,
    }),
    [byDay, days, today]
  );

  const cells = monthGrid(month.year, month.month);
  const isCurrentMonth = today.startsWith(
    `${month.year}-${String(month.month + 1).padStart(2, '0')}`
  );

  function shiftMonth(delta: number) {
    const d = new Date(month.year, month.month + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <RoundButton label="Back" icon="back" onPress={() => router.back()} />
          <Text style={styles.title}>Memories</Text>
          <RoundButton label="Settings" icon="gear" onPress={() => router.push('/settings')} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.stats}>
            <Stat value={`🔥 ${stats.streak}`} label="day streak" color={colors.butter} />
            <Stat value={String(stats.moments)} label="moments" color={colors.sky} />
            <Stat value={String(stats.films)} label="films" color={colors.pinkLight} />
          </View>

          <View style={styles.calendar}>
            <View style={styles.monthRow}>
              <RoundButton label="Previous month" icon="back" small onPress={() => shiftMonth(-1)} />
              <Text style={styles.monthTitle}>{`${monthName(month.month)} ${month.year}`}</Text>
              <RoundButton
                label="Next month"
                icon="next"
                small
                disabled={isCurrentMonth}
                onPress={() => shiftMonth(1)}
              />
            </View>

            <View style={styles.grid}>
              {WEEKDAYS.map((w, i) => (
                <Text key={`w${i}`} style={[styles.cell, styles.weekday]}>
                  {w}
                </Text>
              ))}
              {cells.map((key, i) => {
                if (!key) return <View key={`e${i}`} style={styles.cell} />;
                const summary = byDay.get(key);
                const isToday = key === today;
                const dayNumber = Number(key.slice(8));
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`${key}${summary ? `, ${summary.count} moments` : ''}`}
                    disabled={!summary}
                    onPress={() => router.push({ pathname: '/day', params: { day: key } })}
                    style={styles.cell}>
                    <View style={[styles.dayCircle, isToday && styles.today, summary && styles.dayFilled]}>
                      {summary?.cover ? (
                        <Image source={{ uri: summary.cover }} style={styles.cover} contentFit="cover" />
                      ) : summary ? (
                        <Moon mood={moodForMoments(summary.count)} size={30} />
                      ) : (
                        <Text style={styles.dayNumber}>{dayNumber}</Text>
                      )}
                    </View>
                    {summary?.has_film ? <View style={styles.filmDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {days.length === 0 ? (
            <View style={styles.empty}>
              <Moon mood="crescent" size={110} />
              <Text style={styles.emptyText}>No memories yet. Your first moment lands here.</Text>
            </View>
          ) : (
            <Text style={styles.hint}>Tap a day to relive it. A dot means its film is saved.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RoundButton({
  label,
  icon,
  onPress,
  small,
  disabled,
}: {
  label: string;
  icon: 'back' | 'next' | 'gear';
  onPress: () => void;
  small?: boolean;
  disabled?: boolean;
}) {
  const size = small ? 38 : 46;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.round,
        { width: size, height: size, borderRadius: size / 2 },
        disabled && styles.disabled,
      ]}>
      <Icon name={icon} size={small ? 18 : 22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  content: { paddingHorizontal: 22, paddingBottom: 60, gap: spacing.lg, paddingTop: spacing.sm },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { ...sticker(3), flex: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink },
  calendar: { ...sticker(4), backgroundColor: colors.card, borderRadius: radius.lg, padding: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  weekday: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.inkSoft,
    textAlign: 'center',
    aspectRatio: 1.6,
  },
  dayCircle: {
    width: '84%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayFilled: { backgroundColor: colors.lilac, borderWidth: 2, borderColor: colors.ink },
  today: { borderWidth: 2, borderColor: colors.pink },
  cover: { width: '100%', height: '100%' },
  dayNumber: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.inkSoft },
  filmDot: {
    position: 'absolute',
    bottom: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pink,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  round: {
    ...sticker(3),
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
  empty: { alignItems: 'center', gap: spacing.md },
  emptyText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.inkSoft, textAlign: 'center' },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, textAlign: 'center' },
});
