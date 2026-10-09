import type { SQLiteDatabase } from 'expo-sqlite';

import { dayKey } from '@/lib/day';

export type MomentKind = 'video' | 'photo' | 'text';

export type Moment = {
  id: number;
  kind: MomentKind;
  uri: string | null;
  text: string | null;
  captured_at: number;
  day: string;
  created_at: number;
};

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
}

export async function addMoment(
  db: SQLiteDatabase,
  input: { kind: MomentKind; uri?: string | null; text?: string | null; capturedAt?: number }
): Promise<number> {
  const capturedAt = input.capturedAt ?? Date.now();
  const result = await db.runAsync(
    'INSERT INTO moments (kind, uri, text, captured_at, day, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    input.kind,
    input.uri ?? null,
    input.text ?? null,
    capturedAt,
    dayKey(new Date(capturedAt)),
    Date.now()
  );
  return result.lastInsertRowId;
}

export function momentsForDay(db: SQLiteDatabase, day: string): Promise<Moment[]> {
  return db.getAllAsync<Moment>(
    'SELECT * FROM moments WHERE day = ? ORDER BY captured_at ASC',
    day
  );
}

export async function removeMoment(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM moments WHERE id = ?', id);
}
