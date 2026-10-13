import {
  addMoment,
  dayPlanFor,
  daySummaries,
  filmForDay,
  loadSettings,
  migrate,
  momentsForDay,
  removeMoment,
  saveFilm,
  saveSettings,
  setDayPlan,
  setVibe,
} from '@/lib/db';
import { cancelTodaysNudge } from '@/lib/notify';
import { openTestDatabase } from '@/test/sqlite';

jest.mock('@/lib/notify', () => ({ cancelTodaysNudge: jest.fn() }));

const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();

async function freshDb() {
  const db = openTestDatabase();
  await migrate(db);
  return db;
}

describe('migrate', () => {
  it('brings an empty database to the latest version', async () => {
    const db = await freshDb();
    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 3 });
  });

  it('is safe to run on every launch', async () => {
    const db = await freshDb();
    await migrate(db);
    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 3 });
  });

  it('upgrades a version 1 database without losing moments', async () => {
    const db = openTestDatabase();
    await db.execAsync(`
      CREATE TABLE moments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, uri TEXT, text TEXT,
        captured_at INTEGER NOT NULL, day TEXT NOT NULL, created_at INTEGER NOT NULL
      );
      INSERT INTO moments (kind, text, captured_at, day, created_at) VALUES ('text', 'old', 1, '2026-09-01', 1);
      PRAGMA user_version = 1;
    `);

    await migrate(db);

    const [moment] = await momentsForDay(db, '2026-09-01');
    expect(moment).toMatchObject({ text: 'old', vibe: null, shot: null });
    expect(await loadSettings(db)).toEqual({ name: '', filmHour: 22, onboarded: false });
  });
});

describe('moments', () => {
  it('files a moment under its day, with the 04:00 rollover', async () => {
    const db = await freshDb();
    await addMoment(db, { kind: 'text', text: 'late snack', capturedAt: at(14, 2) });
    await addMoment(db, { kind: 'text', text: 'breakfast', capturedAt: at(14, 9) });

    expect((await momentsForDay(db, '2026-10-13')).map((m) => m.text)).toEqual(['late snack']);
    expect((await momentsForDay(db, '2026-10-14')).map((m) => m.text)).toEqual(['breakfast']);
  });

  it('orders a day by when things happened, not when they were added', async () => {
    const db = await freshDb();
    await addMoment(db, { kind: 'text', text: 'evening', capturedAt: at(13, 20) });
    await addMoment(db, { kind: 'text', text: 'morning', capturedAt: at(13, 8) });

    expect((await momentsForDay(db, '2026-10-13')).map((m) => m.text)).toEqual(['morning', 'evening']);
  });

  it('cancels the reminder only for a moment added today', async () => {
    const db = await freshDb();
    jest.mocked(cancelTodaysNudge).mockClear();

    await addMoment(db, { kind: 'text', text: 'old', capturedAt: at(1, 12) });
    expect(cancelTodaysNudge).not.toHaveBeenCalled();

    await addMoment(db, { kind: 'text', text: 'now' });
    expect(cancelTodaysNudge).toHaveBeenCalledTimes(1);
  });
});

describe('saved films go stale', () => {
  async function dayWithFilm() {
    const db = await freshDb();
    const id = await addMoment(db, { kind: 'photo', uri: 'file:///a.jpg', capturedAt: at(13, 10) });
    await saveFilm(db, '2026-10-13', 'file:///film.mp4', 1);
    return { db, id };
  }

  it('when a moment is added to the day', async () => {
    const { db } = await dayWithFilm();
    await addMoment(db, { kind: 'text', text: 'more', capturedAt: at(13, 11) });
    expect(await filmForDay(db, '2026-10-13')).toBeNull();
  });

  it('when a moment gets a new vibe', async () => {
    const { db, id } = await dayWithFilm();
    await setVibe(db, id, 'cozy');
    expect(await filmForDay(db, '2026-10-13')).toBeNull();
    expect((await momentsForDay(db, '2026-10-13'))[0].vibe).toBe('cozy');
  });

  it('when a moment is removed', async () => {
    const { db, id } = await dayWithFilm();
    await removeMoment(db, id);
    expect(await filmForDay(db, '2026-10-13')).toBeNull();
    expect(await momentsForDay(db, '2026-10-13')).toEqual([]);
  });

  it('but not when another day changes', async () => {
    const { db } = await dayWithFilm();
    await addMoment(db, { kind: 'text', text: 'other day', capturedAt: at(12, 10) });
    expect(await filmForDay(db, '2026-10-13')).toMatchObject({ uri: 'file:///film.mp4' });
  });
});

describe('daySummaries', () => {
  it('lists days newest first with a photo cover and film flag', async () => {
    const db = await freshDb();
    await addMoment(db, { kind: 'text', text: 'hi', capturedAt: at(12, 9) });
    await addMoment(db, { kind: 'photo', uri: 'file:///late.jpg', capturedAt: at(13, 18) });
    await addMoment(db, { kind: 'photo', uri: 'file:///early.jpg', capturedAt: at(13, 7) });
    await saveFilm(db, '2026-10-13', 'file:///film.mp4', 2);

    expect(await daySummaries(db)).toEqual([
      { day: '2026-10-13', count: 2, cover: 'file:///early.jpg', has_film: 1 },
      { day: '2026-10-12', count: 1, cover: null, has_film: 0 },
    ]);
  });
});

describe('settings', () => {
  it('round-trips name, film hour and onboarding', async () => {
    const db = await freshDb();
    await saveSettings(db, { name: 'Lola', filmHour: 21, onboarded: true });
    expect(await loadSettings(db)).toEqual({ name: 'Lola', filmHour: 21, onboarded: true });
  });

  it('keeps a day plan per day and clears it', async () => {
    const db = await freshDb();
    await setDayPlan(db, '2026-10-13', 'walk');
    expect(await dayPlanFor(db, '2026-10-13')).toBe('walk');
    expect(await dayPlanFor(db, '2026-10-14')).toBeNull();

    await setDayPlan(db, '2026-10-13', null);
    expect(await dayPlanFor(db, '2026-10-13')).toBeNull();
    expect(await loadSettings(db)).toMatchObject({ name: '' });
  });
});
