import { dayKey, exifCapturedAt, formatHour, formatMonthDay, formatWeekday, monthGrid, previousDay, streak } from '@/lib/day';

describe('dayKey', () => {
  it('keeps the small hours with the night before', () => {
    expect(dayKey(new Date(2026, 9, 13, 3, 59))).toBe('2026-10-12');
    expect(dayKey(new Date(2026, 9, 13, 4, 0))).toBe('2026-10-13');
  });

  it('rolls back across month and year boundaries', () => {
    expect(dayKey(new Date(2026, 10, 1, 1, 30))).toBe('2026-10-31');
    expect(dayKey(new Date(2027, 0, 1, 0, 5))).toBe('2026-12-31');
    expect(dayKey(new Date(2028, 2, 1, 2, 0))).toBe('2028-02-29');
  });
});

describe('previousDay', () => {
  it('steps back one calendar day', () => {
    expect(previousDay('2026-10-13')).toBe('2026-10-12');
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });
});

describe('streak', () => {
  const days = new Set(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']);

  it('counts consecutive days back from today', () => {
    expect(streak(days, '2026-10-13')).toBe(4);
  });

  it('does not break while today is still empty', () => {
    expect(streak(days, '2026-10-14')).toBe(4);
  });

  it('is zero once a whole day was missed', () => {
    expect(streak(days, '2026-10-15')).toBe(0);
  });

  it('stops at the first gap', () => {
    expect(streak(new Set(['2026-10-08', '2026-10-10', '2026-10-11']), '2026-10-11')).toBe(2);
  });
});

describe('exifCapturedAt', () => {
  it('reads the EXIF timestamp format as local time', () => {
    expect(exifCapturedAt({ DateTimeOriginal: '2026:09:16 13:45:02' })).toBe(
      new Date(2026, 8, 16, 13, 45, 2).getTime()
    );
  });

  it('falls back to DateTime', () => {
    expect(exifCapturedAt({ DateTime: '2026:09:16 08:00:00' })).toBe(new Date(2026, 8, 16, 8).getTime());
  });

  it('returns null for missing or garbled values', () => {
    expect(exifCapturedAt(null)).toBeNull();
    expect(exifCapturedAt({})).toBeNull();
    expect(exifCapturedAt({ DateTimeOriginal: 'yesterday' })).toBeNull();
    expect(exifCapturedAt({ DateTimeOriginal: 1694872000 })).toBeNull();
  });
});

describe('formatting', () => {
  it('names days and hours the way the UI shows them', () => {
    expect(formatWeekday('2026-10-13')).toBe('Tuesday');
    expect(formatMonthDay('2026-10-13')).toBe('October 13');
    expect(formatHour(0)).toBe('12 AM');
    expect(formatHour(12)).toBe('12 PM');
    expect(formatHour(22)).toBe('10 PM');
  });
});

describe('monthGrid', () => {
  it('pads the first week so it starts on Monday', () => {
    const october = monthGrid(2026, 9);
    expect(october.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(october.filter(Boolean)).toHaveLength(31);
    expect(october.at(-1)).toBe('2026-10-31');
  });

  it('knows leap years', () => {
    expect(monthGrid(2028, 1).filter(Boolean)).toHaveLength(29);
    expect(monthGrid(2027, 1).filter(Boolean)).toHaveLength(28);
  });
});
