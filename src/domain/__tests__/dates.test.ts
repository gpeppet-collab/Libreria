import { formatDateIt, isIsoDate, parseIsoDate, toIsoDate } from '../dates';

describe('dates', () => {
  it('converte usando il giorno locale', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 10, 14, 0, 1))).toBe('2026-11-14');
  });

  it('interpreta solo date reali', () => {
    expect(toIsoDate(parseIsoDate('2026-02-28')!)).toBe('2026-02-28');
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('14/11/2026')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2025-02-29')).toBe(false);
  });

  it('formatta all italiana', () => {
    expect(formatDateIt('2026-11-14')).toBe('14/11/2026');
    expect(formatDateIt(null)).toBe('');
    expect(formatDateIt('boh')).toBe('boh');
  });
});
