import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VIBES } from '@/lib/vibes';
import { colors, fonts, radius, spacing, sticker } from '@/theme';

/** A row of vibe chips; tapping the selected one clears it. */
export function VibeChips({
  value,
  onChange,
  dark,
}: {
  value: string | null;
  onChange: (vibe: string | null) => void;
  dark?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={[styles.chips, dark && styles.chipsInset]}>
      {VIBES.map((vibe) => {
        const selected = vibe.key === value;
        return (
          <Pressable
            key={vibe.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={vibe.label}
            onPress={() => onChange(selected ? null : vibe.key)}
            style={[
              styles.chip,
              dark && styles.chipDark,
              selected && { backgroundColor: vibe.color, borderColor: colors.ink },
            ]}>
            <Text style={styles.emoji}>{vibe.emoji}</Text>
            <Text style={[styles.label, dark && !selected && styles.labelDark]}>{vibe.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Bottom sheet to set the vibe of a moment that's already saved. */
export function VibeSheet({
  visible,
  value,
  onChange,
  onClose,
  onDelete,
}: {
  visible: boolean;
  value: string | null;
  onChange: (vibe: string | null) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <Text style={styles.title}>How did it feel?</Text>
        <VibeChips value={value} onChange={onChange} />
        {onDelete && (
          <Pressable accessibilityRole="button" onPress={onDelete} hitSlop={10} style={styles.delete}>
            <Text style={styles.deleteText}>Delete this moment</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, alignSelf: 'stretch' },
  chips: { gap: 8, paddingHorizontal: 2, paddingVertical: 4 },
  chipsInset: { paddingHorizontal: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.card,
  },
  chipDark: { backgroundColor: 'rgba(37,33,58,0.55)', borderColor: colors.bg },
  emoji: { fontSize: 16 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  labelDark: { color: colors.bg },
  backdrop: { flex: 1, backgroundColor: 'rgba(47,42,69,0.35)' },
  sheet: {
    ...sticker(0),
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomWidth: 0,
    padding: spacing.lg,
    paddingBottom: 48,
    gap: spacing.md,
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  delete: { alignSelf: 'center', paddingTop: spacing.sm },
  deleteText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.danger },
});
