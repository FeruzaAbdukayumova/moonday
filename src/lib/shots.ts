import { colors } from '@/theme';

/** One idea to film: what to point at, and one line on how to make it look good. */
export type Shot = { key: string; what: string; how: string };

export type DayPlan = { key: string; emoji: string; label: string; color: string; shots: Shot[] };

/**
 * A day plan gives the film a shape: a start, details, movement, people or a pause, an ending.
 * Shot keys are stored on the moment, so they must never be renamed.
 */
export const DAY_PLANS: DayPlan[] = [
  {
    key: 'cozy',
    emoji: '🕯️',
    label: 'Cozy day',
    color: colors.pinkLight,
    shots: [
      { key: 'cozy-1', what: 'Morning light through the window', how: 'Film it from bed and keep the phone still' },
      { key: 'cozy-2', what: 'Your cup from above', how: 'Hold the phone flat over it and wait for the steam' },
      { key: 'cozy-3', what: 'Your hands doing something', how: 'Cooking, writing, a book. Get really close' },
      { key: 'cozy-4', what: 'Your favorite corner', how: 'Walk the camera toward it, slowly' },
      { key: 'cozy-5', what: 'The last lamp of the day', how: 'Film it, then switch it off on camera' },
    ],
  },
  {
    key: 'walk',
    emoji: '🚶',
    label: 'City walk',
    color: colors.mint,
    shots: [
      { key: 'walk-1', what: 'Your feet stepping out', how: 'Point the phone down at your shoes and walk' },
      { key: 'walk-2', what: 'Buildings or trees against the sky', how: 'Start low and tilt the phone up slowly' },
      { key: 'walk-3', what: 'A tiny detail: a sign, a door, a cat', how: 'Get close until it fills the screen' },
      { key: 'walk-4', what: 'The view while moving', how: 'Lean the phone on a window and let the world pass' },
      { key: 'walk-5', what: 'Golden hour', how: 'Film your shadow or the sun on a wall' },
    ],
  },
  {
    key: 'busy',
    emoji: '💻',
    label: 'Busy day',
    color: colors.sky,
    shots: [
      { key: 'busy-1', what: 'Breakfast or coffee', how: 'Film from above and let your hand reach in' },
      { key: 'busy-2', what: 'Your desk', how: 'Slide the phone slowly along the desk' },
      { key: 'busy-3', what: 'Work in progress', how: 'Close up on your hands, not your face' },
      { key: 'busy-4', what: 'What you look at on a break', how: 'Hold still for 3 seconds' },
      { key: 'busy-5', what: 'The moment you are done', how: 'Film the laptop closing or the lights going off' },
    ],
  },
  {
    key: 'friends',
    emoji: '👯',
    label: 'Friends',
    color: colors.butter,
    shots: [
      { key: 'friends-1', what: 'Someone walking toward you', how: 'Stay still and let them walk into the frame' },
      { key: 'friends-2', what: 'The table between you', how: 'Film from above while hands reach in' },
      { key: 'friends-3', what: 'A friend mid-laugh', how: "Film from your seat, don't ask them to pose" },
      { key: 'friends-4', what: 'Details: shoes, hands, drinks', how: 'Get close, one thing at a time' },
      { key: 'friends-5', what: 'Goodbye', how: 'Keep the camera still as they walk away' },
    ],
  },
];

/** Everyone gets the same challenge on the same day. Once circles exist, friends see each other's. */
const CHALLENGES: Shot[] = [
  { key: 'red', what: 'Something red', how: 'Fill the whole screen with it' },
  { key: 'view', what: 'Your view right now', how: 'Hold still for 3 seconds, no zoom' },
  { key: 'round', what: 'Something round', how: 'Put it right in the middle of the frame' },
  { key: 'shadow', what: 'A shadow', how: 'Look for low sun and film the shadow, not the thing' },
  { key: 'smile', what: 'Something that made you smile', how: 'Start filming before it happens' },
  { key: 'sky', what: 'The sky', how: 'Keep a roof or a tree at the bottom edge' },
  { key: 'shoes', what: 'Your shoes today', how: 'Phone near the ground, take two steps' },
  { key: 'tiny', what: 'Something tiny, very close', how: 'Move in until it goes blurry, then back off a bit' },
  { key: 'reflection', what: 'A reflection', how: 'A puddle, a window, a spoon. Film the reflection only' },
  { key: 'lunch', what: 'Your lunch', how: 'From above, with your hand taking the first bite' },
  { key: 'moving', what: 'Something moving', how: 'Keep the phone still and let it move through' },
  { key: 'door', what: 'A door you walk through', how: 'Film it opening from the inside' },
  { key: 'pink', what: 'Something pink', how: 'The softer the light, the better' },
  { key: 'window', what: 'A window', how: 'Film what is outside, with the frame around it' },
  { key: 'pattern', what: 'A pattern', how: 'Tiles, leaves, fabric. Fill the screen' },
  { key: 'soft', what: 'Something soft', how: 'Touch it on camera' },
  { key: 'light', what: 'Light through something', how: 'Curtains, leaves, a glass. Film toward the light' },
  { key: 'street', what: 'The street outside', how: 'Hold still and let people pass' },
  { key: 'ignore', what: 'Something you always walk past', how: 'Film it like it is famous' },
  { key: 'sound', what: 'A sound you like', how: 'Get close to where it comes from' },
];

export const CHALLENGE_SHOT = 'challenge';

/** Today's challenge, picked from the date so it's the same for everyone. */
export function challengeFor(day: string): Shot {
  const daysSinceEpoch = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return CHALLENGES[daysSinceEpoch % CHALLENGES.length];
}

/** A random filming tip for the camera when no shot was picked. */
export const CAMERA_TIPS = [
  'Hold still for 3 seconds. Still clips look calm.',
  'Get closer. Details look better than wide shots.',
  'Keep the light behind you or to the side.',
  "Move slowly, like you're carrying soup.",
  'Start filming before the moment happens.',
  'Try a low angle. Put the phone near the ground.',
  'Put the main thing on a grid line, not in the middle.',
];

export function planFor(key: string | null | undefined): DayPlan | null {
  return DAY_PLANS.find((p) => p.key === key) ?? null;
}

/** Finds the shot behind a stored key, whether it's a plan slot or the day's challenge. */
export function shotFor(key: string | null | undefined, day: string): Shot | null {
  if (!key) return null;
  if (key === CHALLENGE_SHOT) return challengeFor(day);
  for (const plan of DAY_PLANS) {
    const shot = plan.shots.find((s) => s.key === key);
    if (shot) return shot;
  }
  return null;
}
