import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui';
import { momentsForDay } from '@/lib/db';
import { dayKey, formatHour } from '@/lib/day';
import { askForNotifications, notificationsAllowed, scheduleReminders } from '@/lib/notify';
import { useSettings } from '@/lib/settings';
import { FILM_HOURS, colors, fonts, radius, spacing, sticker } from '@/theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings, update } = useSettings();
  const [name, setName] = useState(settings.name);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      notificationsAllowed().then(setAllowed);
    }, [])
  );

  async function reschedule(filmHour: number) {
    const todays = await momentsForDay(db, dayKey());
    await scheduleReminders(filmHour, todays.length > 0);
  }

  async function chooseHour(hour: number) {
    await update({ filmHour: hour });
    await reschedule(hour);
  }

  async function enableNotifications() {
    const granted = await askForNotifications();
    setAllowed(granted);
    if (granted) await reschedule(settings.filmHour);
    // Once denied, iOS won't ask again; only the Settings app can turn them on.
    else Linking.openSettings();
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.round}>
            <Icon name="back" size={22} />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Section title="Your name">
            <TextInput
              value={name}
              onChangeText={setName}
              onEndEditing={() => update({ name: name.trim() })}
              placeholder="Your name"
              placeholderTextColor={colors.inkSoft}
              maxLength={30}
              returnKeyType="done"
              style={styles.input}
            />
          </Section>

          <Section title="Film time">
            <View style={styles.hours}>
              {FILM_HOURS.map((hour) => (
                <Pressable
                  key={hour}
                  accessibilityRole="button"
                  accessibilityState={{ selected: hour === settings.filmHour }}
                  onPress={() => chooseHour(hour)}
                  style={[styles.hour, hour === settings.filmHour && styles.hourActive]}>
                  <Text style={styles.hourText}>{formatHour(hour)}</Text>
                </Pressable>
              ))}
            </View>
          </Section>

          <Section title="Notifications">
            {allowed ? (
              <View style={styles.row}>
                <Icon name="check" size={22} />
                <Text style={styles.rowText}>
                  {`On: your film at ${formatHour(settings.filmHour)}, a nudge at 6 PM on empty days.`}
                </Text>
              </View>
            ) : (
              <Button
                label="Turn on notifications"
                tone="white"
                size="medium"
                icon={<Icon name="bell" size={20} />}
                onPress={enableNotifications}
              />
            )}
          </Section>

          <Text style={styles.footnote}>
            Your moments stay on this phone. They only leave it to be stitched into your film; the
            server deletes them right after and keeps the film just long enough to send it back.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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
    paddingBottom: spacing.sm,
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
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  content: { padding: 22, gap: spacing.lg },
  section: { gap: 10 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  input: {
    borderWidth: 2.5,
    borderColor: colors.ink,
    boxShadow: `0 4px 0 ${colors.ink}`,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: colors.ink,
  },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hour: {
    ...sticker(3),
    paddingHorizontal: 16,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    justifyContent: 'center',
  },
  hourActive: { backgroundColor: colors.pink },
  hourText: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: colors.ink },
  footnote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
});
