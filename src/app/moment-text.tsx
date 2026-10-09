import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Icon } from '@/components/icon';
import { Moon } from '@/components/moon';
import { Button, Chip } from '@/components/ui';
import { addMoment } from '@/lib/db';
import { formatClock } from '@/lib/day';
import { colors, fonts, radius, spacing, sticker } from '@/theme';

const MAX_LENGTH = 280;

export default function TextMomentScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [text, setText] = useState('');
  const [now] = useState(() => Date.now());
  const empty = !text.trim();

  async function save() {
    const trimmed = text.trim();
    if (!trimmed) return;

    await addMoment(db, { kind: 'text', text: trimmed, capturedAt: now });
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={styles.close}>
          <Icon name="close" size={22} />
        </Pressable>
        <Chip label={formatClock(now)} color={colors.pink} />
      </View>

      <View style={styles.prompt}>
        <Moon mood="wink" size={56} />
        <Text style={styles.promptText}>What just happened?</Text>
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="One line is enough..."
          placeholderTextColor={colors.inkSoft}
          multiline
          autoFocus
          maxLength={MAX_LENGTH}
        />
        <Text style={styles.counter}>{MAX_LENGTH - text.length}</Text>
      </View>

      <Button label="Add to today" onPress={save} disabled={empty} style={styles.save} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  promptText: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  card: {
    ...sticker(4),
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 29,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  counter: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkSoft, textAlign: 'right' },
  save: { marginBottom: spacing.md },
});
