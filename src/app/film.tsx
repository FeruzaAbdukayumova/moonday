import { File } from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Moon, type MoonMood } from '@/components/moon';
import { Button } from '@/components/ui';
import { filmForDay, momentsForDay, saveFilm } from '@/lib/db';
import { dayKey, formatMonthDay } from '@/lib/day';
import { makeFilm, type FilmPhase } from '@/lib/film';
import { useSettings } from '@/lib/settings';
import { colors, fonts, radius, spacing } from '@/theme';

type State =
  | FilmPhase
  | { name: 'ready'; uri: string }
  | { name: 'failed'; message: string };

/** The moon fills up while the film renders, so waiting has something to watch. */
function describe(state: FilmPhase): { line: string; mood: MoonMood; progress: number } {
  switch (state.name) {
    case 'uploading':
      return { line: 'Collecting your moments...', mood: 'crescent', progress: 0.05 };
    case 'rendering':
      return {
        line: `Filling up the moon · ${Math.round(state.progress * 100)}%`,
        mood: state.progress < 0.5 ? 'crescent' : 'half',
        progress: 0.1 + state.progress * 0.8,
      };
    case 'downloading':
      return { line: 'Almost full...', mood: 'half', progress: 0.95 };
  }
}

export default function FilmScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = params.day ?? dayKey();
  const [state, setState] = useState<State>({ name: 'uploading' });
  const [attempt, setAttempt] = useState(0);
  const [momentCount, setMomentCount] = useState(0);
  const { settings } = useSettings();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const moments = await momentsForDay(db, day);
        if (!cancelled) setMomentCount(moments.length);
        if (moments.length === 0) {
          if (!cancelled) setState({ name: 'failed', message: 'This day has no moments yet. Catch one first!' });
          return;
        }

        // A film that's still current plays straight away, no server round trip.
        const saved = attempt === 0 ? await filmForDay(db, day) : null;
        if (saved && new File(saved.uri).exists) {
          if (!cancelled) setState({ name: 'ready', uri: saved.uri });
          return;
        }

        const uri = await makeFilm(
          day,
          settings.name,
          moments,
          (phase) => !cancelled && setState(phase),
          () => cancelled
        );
        if (uri) await saveFilm(db, day, uri, moments.length);
        if (uri && !cancelled) setState({ name: 'ready', uri });
      } catch (error) {
        console.warn('film failed', error);
        if (!cancelled) {
          setState({
            name: 'failed',
            message: "The moon got stuck. Check your internet (or the render server) and try again.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, day, attempt, settings.name]);

  const retry = useCallback(() => {
    setState({ name: 'uploading' });
    setAttempt((n) => n + 1);
  }, []);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{formatMonthDay(day)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.close}>
            <Icon name="close" size={22} color={colors.bg} />
          </Pressable>
        </View>

        {state.name === 'ready' ? (
          <FilmPlayer uri={state.uri} momentCount={momentCount} />
        ) : state.name === 'failed' ? (
          <View style={styles.center}>
            <Moon mood="crescent" size={150} />
            <Text style={styles.message}>{state.message}</Text>
            <Button label="Try again" tone="white" onPress={retry} style={styles.wide} />
          </View>
        ) : (
          <Waiting state={state} />
        )}
      </SafeAreaView>
    </View>
  );
}

function Waiting({ state }: { state: FilmPhase }) {
  const { line, mood, progress } = describe(state);
  return (
    <View style={styles.center}>
      <Moon mood={mood} size={190} />
      <Text style={styles.waitingTitle}>{line}</Text>
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

function FilmPlayer({ uri, momentCount }: { uri: string; momentCount: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={styles.ready}>
      <View style={styles.readyTitleRow}>
        <Moon mood="wow" size={64} glow />
        <View>
          <Text style={styles.readyTitle}>Full moon!</Text>
          <Text style={styles.readySubtitle}>
            {`${momentCount} ${momentCount === 1 ? 'moment' : 'moments'} · the Oscar is waiting`}
          </Text>
        </View>
      </View>
      <View style={styles.playerFrame}>
        <VideoView player={player} style={styles.player} contentFit="cover" nativeControls />
      </View>
      <Button
        label="Share"
        icon={<Icon name="share" size={22} />}
        onPress={() => Sharing.shareAsync(uri, { mimeType: 'video/mp4', UTI: 'public.mpeg-4' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerText: { fontFamily: fonts.display, fontSize: 16, color: colors.bg },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  wide: { alignSelf: 'stretch' },
  waitingTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.butter, textAlign: 'center' },
  message: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 23, color: colors.bg, textAlign: 'center' },
  meter: {
    width: 240,
    height: 16,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.bg,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: colors.butter },
  ready: { flex: 1, padding: spacing.md, gap: spacing.md },
  readyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  readyTitle: { fontFamily: fonts.display, fontSize: 34, color: colors.butter, letterSpacing: -0.8 },
  readySubtitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.bg },
  playerFrame: {
    flex: 1,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: colors.bg,
    overflow: 'hidden',
    backgroundColor: colors.nightSoft,
  },
  player: { flex: 1 },
});
