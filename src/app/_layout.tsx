import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrate } from '@/lib/db';
import { dayKey } from '@/lib/day';
import { SettingsProvider } from '@/lib/settings';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  // Rendering before the fonts land would flash system fonts under the splash.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="bugun.db" onInit={migrate}>
        <SettingsProvider>
        <NotificationRouter />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="capture" options={{ animation: 'fade' }} />
          <Stack.Screen name="moment-text" options={{ presentation: 'modal' }} />
          <Stack.Screen name="film" options={{ presentation: 'modal' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="memories" />
          <Stack.Screen name="day" />
          <Stack.Screen name="settings" />
        </Stack>
        </SettingsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

/** Tapping the film-time notification opens tonight's film. */
function NotificationRouter() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response) return;
    if (response.notification.request.content.data?.screen === 'film') {
      router.push({ pathname: '/film', params: { day: dayKey() } });
    }
    Notifications.clearLastNotificationResponse();
  }, [response, router]);

  return null;
}
