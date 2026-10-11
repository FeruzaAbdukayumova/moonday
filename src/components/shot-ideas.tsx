import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { CHALLENGE_SHOT, DAY_PLANS, challengeFor, planFor } from '@/lib/shots';
import { colors, fonts, radius, spacing, sticker } from '@/theme';

/** Today's challenge plus the day plan's shot list: what to film when you have no idea. */
export function ShotIdeas({
  day,
  plan,
  doneShots,
  onPickPlan,
  onShoot,
}: {
  day: string;
  plan: string | null;
  doneShots: Set<string>;
  onPickPlan: (plan: string | null) => void;
  onShoot: (shot: string) => void;
}) {
  const challenge = challengeFor(day);
  const challengeDone = doneShots.has(CHALLENGE_SHOT);
  const picked = planFor(plan);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Today's challenge: ${challenge.what}`}
        onPress={() => onShoot(CHALLENGE_SHOT)}
        style={[styles.challenge, challengeDone && styles.challengeDone]}>
        <Text style={styles.challengeEmoji}>{challengeDone ? '✅' : '🎯'}</Text>
        <View style={styles.flex}>
          <Text style={styles.label}>{"TODAY'S CHALLENGE"}</Text>
          <Text style={styles.challengeWhat}>{challenge.what}</Text>
        </View>
        <Icon name={challengeDone ? 'check' : 'camera'} size={22} />
      </Pressable>

      {picked ? (
        <View style={[styles.plan, { backgroundColor: picked.color }]}>
          <View style={styles.planHead}>
            <Text style={styles.planTitle}>
              {`${picked.emoji} ${picked.label} · ${picked.shots.filter((s) => doneShots.has(s.key)).length}/${picked.shots.length}`}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => onPickPlan(null)} hitSlop={10}>
              <Text style={styles.change}>change</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slots}>
            {picked.shots.map((shot, i) => {
              const done = doneShots.has(shot.key);
              return (
                <Pressable
                  key={shot.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Shot ${i + 1}: ${shot.what}${done ? ', done' : ''}`}
                  onPress={() => onShoot(shot.key)}
                  style={[styles.slot, done && styles.slotDone]}>
                  <Text style={styles.slotNumber}>{done ? '✓' : i + 1}</Text>
                  <Text style={styles.slotWhat} numberOfLines={3}>
                    {shot.what}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.plan}>
          <Text style={styles.planTitle}>What kind of day is it?</Text>
          <Text style={styles.planHint}>Pick one and get 5 shot ideas for your film</Text>
          <View style={styles.planChoices}>
            {DAY_PLANS.map((p) => (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                onPress={() => onPickPlan(p.key)}
                style={[styles.choice, { backgroundColor: p.color }]}>
                <Text style={styles.choiceText}>{`${p.emoji} ${p.label}`}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginBottom: spacing.lg },
  flex: { flex: 1 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.inkSoft },

  challenge: {
    ...sticker(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  challengeDone: { backgroundColor: colors.mint },
  challengeEmoji: { fontSize: 26 },
  challengeWhat: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },

  plan: {
    ...sticker(3),
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
  },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  planHint: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: -6 },
  change: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft, textDecorationLine: 'underline' },
  planChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  choiceText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },

  slots: { gap: 8 },
  slot: {
    width: 118,
    minHeight: 92,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 10,
    gap: 4,
  },
  slotDone: { backgroundColor: colors.mint },
  slotNumber: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  slotWhat: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 17, color: colors.ink },
});
