import type { SQLiteDatabase } from 'expo-sqlite';

import { dayKey } from '@/lib/day';
import { cancelTodaysNudge } from '@/lib/notify';

export type MomentKind = 'video' | 'photo' | 'text';

export type Moment = {
  id: number;
  kind: MomentKind;
  uri: string | null;
  text: string | null;
  captured_at: number;
  day: string;
  created_at: number;
  vibe: string | null;
};

export type Film = { day: string; uri: string; moment_count: number; created_at: number };

export type DaySummary = { day: string; count: number; cover: string | null; has_film: number };

export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE moments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        uri TEXT,
        text TEXT,
        captured_at INTEGER NOT NULL,
        day TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX moments_day_time ON moments (day, captured_at);

      PRAGMA user_version = 1;
    `);
  }

  if (version < 2) {
    await db.execAsync(`
      ALTER TABLE moments ADD COLUMN vibe TEXT;

      CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

      CREATE TABLE films (
        day TEXT PRIMARY KEY NOT NULL,
        uri TEXT NOT NULL,
        moment_count INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      PRAGMA user_version = 2;
    `);
  }
}

export async function addMoment(
  db: SQLiteDatabase,
  input: {
    kind: MomentKind;
    uri?: string | null;
    text?: string | null;
    capturedAt?: number;
    vibe?: string | null;
  }
): Promise<number> {
  const capturedAt = input.capturedAt ?? Date.now();
  const result = await db.runAsync(
    'INSERT INTO moments (kind, uri, text, captured_at, day, created_at, vibe) VALUES (?, ?, ?, ?, ?, ?, ?)',
    input.kind,
    input.uri ?? null,
    input.text ?? null,
    capturedAt,
    dayKey(new Date(capturedAt)),
    Date.now(),
    input.vibe ?? null
  );
  await forgetFilm(db, dayKey(new Date(capturedAt)));
  if (dayKey(new Date(capturedAt)) === dayKey()) cancelTodaysNudge();
  return result.lastInsertRowId;
}

export function momentsForDay(db: SQLiteDatabase, day: string): Promise<Moment[]> {
  return db.getAllAsync<Moment>(
    'SELECT * FROM moments WHERE day = ? ORDER BY captured_at ASC',
    day
  );
}

export async function removeMoment(db: SQLiteDatabase, id: number) {
  await forgetFilmOf(db, id);
  await db.runAsync('DELETE FROM moments WHERE id = ?', id);
}

/** A saved film goes stale once its day changes; the next watch renders it again. */
async function forgetFilm(db: SQLiteDatabase, day: string) {
  await db.runAsync('DELETE FROM films WHERE day = ?', day);
}

async function forgetFilmOf(db: SQLiteDatabase, momentId: number) {
  await db.runAsync('DELETE FROM films WHERE day = (SELECT day FROM moments WHERE id = ?)', momentId);
}

export async function setVibe(db: SQLiteDatabase, id: number, vibe: string | null) {
  await forgetFilmOf(db, id);
  await db.runAsync('UPDATE moments SET vibe = ? WHERE id = ?', vibe, id);
}

/** Every day that has at least one moment, newest first. */
export function daySummaries(db: SQLiteDatabase): Promise<DaySummary[]> {
  return db.getAllAsync<DaySummary>(`
    SELECT
      m.day,
      COUNT(*) AS count,
      (SELECT uri FROM moments p WHERE p.day = m.day AND p.kind = 'photo' ORDER BY captured_at LIMIT 1) AS cover,
      EXISTS (SELECT 1 FROM films f WHERE f.day = m.day) AS has_film
    FROM moments m
    GROUP BY m.day
    ORDER BY m.day DESC
  `);
}

export function filmForDay(db: SQLiteDatabase, day: string): Promise<Film | null> {
  return db.getFirstAsync<Film>('SELECT * FROM films WHERE day = ?', day);
}

export async function saveFilm(db: SQLiteDatabase, day: string, uri: string, momentCount: number) {
  await db.runAsync(
    'INSERT OR REPLACE INTO films (day, uri, moment_count, created_at) VALUES (?, ?, ?, ?)',
    day,
    uri,
    momentCount,
    Date.now()
  );
}

export type Settings = { name: string; filmHour: number; onboarded: boolean };

const DEFAULT_SETTINGS: Settings = { name: '', filmHour: 22, onboarded: false };

export async function loadSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    name: map.get('name') ?? DEFAULT_SETTINGS.name,
    filmHour: Number(map.get('filmHour') ?? DEFAULT_SETTINGS.filmHour),
    onboarded: map.get('onboarded') === '1',
  };
}

export async function saveSettings(db: SQLiteDatabase, patch: Partial<Settings>) {
  for (const [key, value] of Object.entries(patch)) {
    const stored = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, stored);
  }
}
