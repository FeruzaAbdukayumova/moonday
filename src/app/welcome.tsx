import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Moon, type MoonMood } from '@/components/moon';
import { Bubble, Button } from '@/components/ui';
import { formatHour } from '@/lib/day';
import { askForNotifications, scheduleReminders } from '@/lib/notify';
import { useSettings } from '@/lib/settings';
import { FILM_HOURS, colors, fonts, radius, spacing, sticker } from '@/theme';

const STEPS: { bg: string; mood: MoonMood }[] = [
  { bg: colors.lilac, mood: 'wink' },
  { bg: colors.sky, mood: 'half' },
  { bg: colors.butter, mood: 'cool' },
  { bg: colors.pinkLight, mood: 'party' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { settings, update } = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.name);
  const [filmHour, setFilmHour] = useState(settings.filmHour);

  async function finish(withNotifications: boolean) {
    await update({ name: name.trim(), filmHour, onboarded: true });
    if (withNotifications && (await askForNotifications())) {
      await scheduleReminders(filmHour, false);
    }
    router.replace('/');
  }

  const { bg, mood } = STEPS[step];

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.body}>
            {step === 0 && (
              <>
                <Bubble tilt={-2}>{"Hi! I'm Moonie."}</Bubble>
                <Moon mood={mood} size={170} />
                <Text style={styles.title}>Your day, as a tiny film.</Text>
                <Text style={styles.text}>
                  Catch little moments all day: a 6-second clip, a photo, a line of text. At night I
                  stitch them into a film of your day.
                </Text>
              </>
            )}

            {step === 1 && (
              <>
                <Moon mood={mood} size={130} />
                <Text style={styles.title}>What should I call you?</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.inkSoft}
                  style={styles.input}
                  maxLength={30}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => name.trim() && setStep(2)}
                />
                <Text style={styles.text}>It goes on the title card of your films.</Text>
              </>
            )}

            {step === 2 && (
              <>
                <Moon mood={mood} size={130} />
                <Text style={styles.title}>When should your film drop?</Text>
                <View style={styles.hours}>
                  {FILM_HOURS.map((hour) => (
                    <Pressable
                      key={hour}
                      accessibilityRole="button"
                      accessibilityState={{ selected: hour === filmHour }}
                      onPress={() => setFilmHour(hour)}
                      style={[styles.hour, hour === filmHour && styles.hourActive]}>
                      <Text style={styles.hourText}>{formatHour(hour)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.text}>Every night at this time the moon is full and your film is ready.</Text>
              </>
            )}

            {step === 3 && (
              <>
                <Bubble tilt={2}>{'Can I ping you?'}</Bubble>
                <Moon mood={mood} size={150} />
                <Text style={styles.title}>Only twice, tops.</Text>
                <Text style={styles.text}>
                  {`Once when your film is ready at ${formatHour(filmHour)}, and once at 6 PM if your day is still empty. That's it. Promise.`}
                </Text>
              </>
            )}
          </View>

          <View style={styles.actions}>
            {step < 3 ? (
              <Button
                label={step === 0 ? "Let's go" : 'Next'}
                tone="white"
                style={styles.wide}
                disabled={step === 1 && !name.trim()}
                onPress={() => setStep(step + 1)}
              />
            ) : (
              <>
                <Button label="Yes, ping me" tone="white" style={styles.wide} onPress={() => finish(true)} />
                <Pressable accessibilityRole="button" onPress={() => finish(false)} hitSlop={12}>
                  <Text style={styles.link}>Not now</Text>
                </Pressable>
              </>
            )}
            {step > 0 && step < 3 && (
              <Pressable accessibilityRole="button" onPress={() => setStep(step - 1)} hitSlop={12}>
                <Text style={styles.link}>Back</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.ink },
  dotActive: { width: 28, backgroundColor: colors.ink },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
    textAlign: 'center',
  },
  input: {
    borderWidth: 2.5,
    borderColor: colors.ink,
    boxShadow: `0 4px 0 ${colors.ink}`,
    alignSelf: 'stretch',
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
  },
  hours: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  hour: {
    ...sticker(3),
    paddingHorizontal: 16,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    justifyContent: 'center',
  },
  hourActive: { backgroundColor: colors.pink },
  hourText: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md, alignItems: 'center' },
  wide: { alignSelf: 'stretch' },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
});
