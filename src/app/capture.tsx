import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraType,
} from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gyroscope } from 'expo-sensors';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Moon } from '@/components/moon';
import { Bubble, Button } from '@/components/ui';
import { VibeChips } from '@/components/vibe-picker';
import { addMoment } from '@/lib/db';
import { dayKey } from '@/lib/day';
import { persistMedia } from '@/lib/media';
import { CAMERA_TIPS, shotFor } from '@/lib/shots';
import { MAX_CLIP_SECONDS, colors, fonts, radius, spacing } from '@/theme';

export default function CaptureScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; shot?: string }>();
  const shot = shotFor(params.shot, dayKey());
  const [tip] = useState(() => CAMERA_TIPS[Math.floor(Math.random() * CAMERA_TIPS.length)]);
  const [grid, setGrid] = useState(true);

  const [mode, setMode] = useState<'video' | 'picture'>(
    params.mode === 'picture' ? 'picture' : 'video'
  );
  const [facing, setFacing] = useState<CameraType>('back');
  const [vibe, setVibe] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordingSince, setRecordingSince] = useState(0);
  const [now, setNow] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const shaky = useShake(recording);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [recording]);

  const seconds = recording
    ? Math.min(Math.floor((now - recordingSince) / 1000), MAX_CLIP_SECONDS)
    : 0;

  const needsPermission =
    !cameraPermission?.granted || (mode === 'video' && !microphonePermission?.granted);

  if (needsPermission) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Moon mood="wow" size={130} />
        <Text style={styles.permissionTitle}>{"I'm a moon.\nI can't hold a phone."}</Text>
        <Text style={styles.permissionText}>
          Let me use your camera and microphone to catch your moments.
        </Text>
        <Button
          label="Allow camera"
          style={styles.permissionButton}
          onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
          }}
        />
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.link}>Maybe later</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  async function toggleRecording() {
    if (!cameraRef.current || !ready || saving) return;

    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }

    const startedAt = Date.now();
    setRecordingSince(startedAt);
    setNow(startedAt);
    setRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_CLIP_SECONDS });
      if (video?.uri) {
        setSaving(true);
        const uri = await persistMedia(video.uri, 'video');
        await addMoment(db, { kind: 'video', uri, vibe, shot: params.shot });
        router.back();
      }
    } finally {
      setRecording(false);
      setSaving(false);
    }
  }

  async function takePhoto() {
    if (!cameraRef.current || !ready || saving) return;

    setSaving(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        const uri = await persistMedia(photo.uri, 'photo');
        await addMoment(db, { kind: 'photo', uri, vibe, shot: params.shot });
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode={mode}
        onCameraReady={() => setReady(true)}
      />
      {grid && <ThirdsGrid />}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <View style={styles.topBar}>
            <RoundButton label="Close" onPress={() => router.back()}>
              <Icon name="close" size={24} color={colors.bg} />
            </RoundButton>
            {mode === 'video' && (
              <View style={[styles.timer, recording && styles.timerLive]}>
                <View style={[styles.timerDot, recording && styles.timerDotLive]} />
                <Text style={[styles.timerText, recording && styles.timerTextLive]}>{`0:0${seconds} / 0:0${MAX_CLIP_SECONDS}`}</Text>
              </View>
            )}
            <View style={styles.topRight}>
              <RoundButton label={grid ? 'Hide grid' : 'Show grid'} onPress={() => setGrid(!grid)}>
                <Icon name="grid" size={22} color={grid ? colors.butter : colors.bg} />
              </RoundButton>
              <RoundButton
                label="Flip camera"
                onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
                <Icon name="flip" size={22} color={colors.bg} />
              </RoundButton>
            </View>
          </View>

          {!recording && (
            <View style={styles.shotCard}>
              {shot ? (
                <>
                  <Text style={styles.shotWhat}>{`🎬 ${shot.what}`}</Text>
                  <Text style={styles.shotHow}>{shot.how}</Text>
                </>
              ) : (
                <Text style={styles.shotHow}>{`💡 ${tip}`}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottom}>
          {recording && shaky && (
            <Bubble style={styles.cheer}>Whoa, slower... smooth like butter 🧈</Bubble>
          )}
          {recording && !shaky && seconds < 2 && (
            <Bubble style={styles.cheer}>Hold it still...</Bubble>
          )}
          {recording && !shaky && seconds >= 2 && (
            <Bubble style={styles.cheer}>Ooh, Oscar material.</Bubble>
          )}

          {!recording && <VibeChips value={vibe} onChange={setVibe} dark />}

          <View style={styles.modeSwitch}>
            <ModeTab label="Video" active={mode === 'video'} disabled={recording} onPress={() => setMode('video')} />
            <ModeTab label="Photo" active={mode === 'picture'} disabled={recording} onPress={() => setMode('picture')} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode === 'video' ? (recording ? 'Stop recording' : 'Record') : 'Take photo'}
            style={styles.shutter}
            onPress={mode === 'video' ? toggleRecording : takePhoto}>
            <View style={recording ? styles.shutterInnerRecording : styles.shutterInner} />
          </Pressable>

          <Text style={styles.hint}>
            {mode === 'video' ? `Up to ${MAX_CLIP_SECONDS} seconds` : 'One frame'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Rule-of-thirds lines: put the main thing on a line, not dead center. */
function ThirdsGrid() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.gridLine, styles.gridV, { left: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridV, { left: '66.66%' }]} />
      <View style={[styles.gridLine, styles.gridH, { top: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridH, { top: '66.66%' }]} />
    </View>
  );
}

/** Rotation speed (rad/s) above which a clip starts to look shaky. */
const SHAKE_LIMIT = 1.2;

/** True while the phone turns too fast to film smoothly. Listens only while recording. */
function useShake(active: boolean): boolean {
  const [shaky, setShaky] = useState(false);

  useEffect(() => {
    if (!active) return;
    let smoothed = 0;
    Gyroscope.setUpdateInterval(100);
    const subscription = Gyroscope.addListener(({ x, y, z }) => {
      smoothed = smoothed * 0.7 + Math.hypot(x, y, z) * 0.3;
      setShaky(smoothed > SHAKE_LIMIT);
    });
    return () => {
      subscription.remove();
      setShaky(false);
    };
  }, [active]);

  return active && shaky;
}

function RoundButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round}>
      {children}
    </Pressable>
  );
}

function ModeTab({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.modeTab, active && styles.modeTabActive]}>
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  overlay: { flex: 1, justifyContent: 'space-between' },
  top: { gap: spacing.md },
  topRight: { flexDirection: 'row', gap: 10 },
  shotCard: {
    marginHorizontal: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(37,33,58,0.7)',
    gap: 2,
  },
  shotWhat: { fontFamily: fonts.display, fontSize: 18, color: colors.butter },
  shotHow: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19, color: colors.bg },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(253,247,251,0.35)' },
  gridV: { top: 0, bottom: 0, width: StyleSheet.hairlineWidth * 2 },
  gridH: { left: 0, right: 0, height: StyleSheet.hairlineWidth * 2 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: spacing.sm,
  },
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(37,33,58,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(37,33,58,0.6)',
  },
  timerLive: { backgroundColor: colors.pink },
  timerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pink },
  timerDotLive: { backgroundColor: colors.ink },
  timerText: { fontFamily: fonts.display, fontSize: 18, color: colors.bg },
  timerTextLive: { color: colors.ink },

  bottom: { alignItems: 'center', paddingBottom: spacing.lg, gap: spacing.md },
  cheer: { alignSelf: 'flex-start', marginLeft: spacing.lg },
  modeSwitch: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(37,33,58,0.6)',
  },
  modeTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: radius.pill },
  modeTabActive: { backgroundColor: colors.bg },
  modeTabText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.bg },
  modeTabTextActive: { color: colors.ink },
  shutter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 5,
    borderColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.bg },
  shutterInnerRecording: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.pink },
  hint: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.bg },

  permissionScreen: {
    flex: 1,
    backgroundColor: colors.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  permissionTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    color: colors.ink,
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  permissionButton: { alignSelf: 'stretch', marginTop: spacing.sm },
  link: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.inkSoft },
});
