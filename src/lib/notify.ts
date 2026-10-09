import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { dayKey } from '@/lib/day';

const FILM_ID = 'film-time';
const NUDGE_PREFIX = 'nudge-';
const NUDGE_HOUR = 18;
const NUDGE_DAYS_AHEAD = 7;

/** Show banners even while the app is open; the reveal is the whole point. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function notificationsAllowed(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

export async function askForNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Daily film',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/**
 * One film alarm every night, plus an early-evening nudge on days that are
 * still empty. Nudges are one-off and get cancelled as soon as a moment lands,
 * so nobody is nagged on a day they already captured.
 */
export async function scheduleReminders(filmHour: number, todayHasMoments: boolean) {
  if (!(await notificationsAllowed())) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    identifier: FILM_ID,
    content: {
      title: 'Full moon! 🌕',
      body: "Your film of today is ready. Come watch it.",
      data: { screen: 'film' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: filmHour, minute: 0 },
  });

  const now = new Date();
  for (let offset = 0; offset < NUDGE_DAYS_AHEAD; offset++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, NUDGE_HOUR);
    if (at <= now || at.getHours() >= filmHour) continue;
    if (offset === 0 && todayHasMoments) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: NUDGE_PREFIX + dayKey(at),
      content: {
        title: 'Psst, Moonie here 🌙',
        body: "Today's film is still empty. One tiny moment?",
        data: { screen: 'today' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

/** Call after a moment is saved: today no longer needs a nudge. */
export async function cancelTodaysNudge() {
  try {
    await Notifications.cancelScheduledNotificationAsync(NUDGE_PREFIX + dayKey());
  } catch {
    // Nothing was scheduled; fine.
  }
}
