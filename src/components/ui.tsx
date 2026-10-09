import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radius, spacing, sticker } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  tone?: 'pink' | 'white' | 'lilac' | 'ink';
  size?: 'large' | 'medium';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  icon,
  tone = 'pink',
  size = 'large',
  disabled,
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        size === 'medium' && styles.buttonMedium,
        { backgroundColor: buttonColors[tone].bg },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {icon}
      <Text
        style={[
          styles.buttonLabel,
          size === 'medium' && styles.buttonLabelMedium,
          { color: buttonColors[tone].text },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const buttonColors = {
  pink: { bg: colors.pink, text: colors.ink },
  white: { bg: colors.card, text: colors.ink },
  lilac: { bg: colors.lilac, text: colors.ink },
  ink: { bg: colors.ink, text: colors.bg },
};

/** A speech bubble for the mascot's lines. */
export function Bubble({
  children,
  tilt = 0,
  style,
}: {
  children: ReactNode;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.bubble, { transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <Text style={styles.bubbleText}>{children}</Text>
    </View>
  );
}

export function Chip({
  label,
  color = colors.card,
  icon,
  style,
  textStyle,
}: {
  label: string;
  color?: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: color }, style]}>
      {icon}
      <Text style={[styles.chipText, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    ...sticker(5),
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  buttonMedium: { ...sticker(4), height: 52, borderRadius: radius.md },
  buttonLabel: { fontFamily: fonts.display, fontSize: 20 },
  buttonLabelMedium: { fontSize: 16 },
  pressed: { transform: [{ translateY: 3 }], boxShadow: `0 2px 0 ${colors.ink}` },
  disabled: { opacity: 0.45 },
  bubble: {
    ...sticker(4),
    backgroundColor: colors.card,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  bubbleText: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    lineHeight: 23,
    color: colors.ink,
    textAlign: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
});
