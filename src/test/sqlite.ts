import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

type Param = string | number | null;

/**
 * The slice of expo-sqlite's async API that src/lib/db.ts uses, backed by
 * Node's built-in SQLite so tests run the real SQL without a phone.
 */
export function openTestDatabase(): SQLiteDatabase {
  const db = new DatabaseSync(':memory:');
  const fake = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, ...params: Param[]) {
      const result = db.prepare(sql).run(...params);
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    async getFirstAsync<T>(sql: string, ...params: Param[]) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: Param[]) {
      return db.prepare(sql).all(...params) as T[];
    },
  };
  return fake as unknown as SQLiteDatabase;
}
