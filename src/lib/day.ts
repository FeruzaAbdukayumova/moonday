/**
 * A "day" here follows how people talk about their day, not the calendar:
 * anything before 04:00 still belongs to the night before.
 */
export const DAY_START_HOUR = 4;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayKey(date: Date = new Date()): string {
  const d = new Date(date);
  if (d.getHours() < DAY_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatClock(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parseKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "Thursday" */
export function formatWeekday(key: string): string {
  return WEEKDAYS[parseKey(key).getDay()];
}

/** "September 17" */
export function formatMonthDay(key: string): string {
  const d = parseKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** EXIF stores time as "2026:09:16 13:45:02". Returns null when absent or unparseable. */
export function exifCapturedAt(exif: Record<string, unknown> | null | undefined): number | null {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTime;
  if (typeof raw !== 'string') return null;

  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}
