import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrate } from '@/lib/db';
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
        </Stack>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
