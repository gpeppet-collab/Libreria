import { cleanIsbn, formatIsbn13, isValidIsbn10, isValidIsbn13, normalizeIsbn } from '../isbn';

describe('isbn', () => {
  it('pulisce trattini, spazi e prefisso ISBN', () => {
    expect(cleanIsbn('ISBN 978-0-306-40615-7')).toBe('9780306406157');
    expect(cleanIsbn(' 88 04 66893 x ')).toBe('880466893X');
  });

  it('valida ISBN-13', () => {
    expect(isValidIsbn13('9780306406157')).toBe(true);
    expect(isValidIsbn13('9780306406158')).toBe(false);
    expect(isValidIsbn13('1234567890123')).toBe(false); // prefisso non 978/979
  });

  it('valida ISBN-10', () => {
    expect(isValidIsbn10('0306406152')).toBe(true);
    expect(isValidIsbn10('0306406153')).toBe(false);
    expect(isValidIsbn10('080442957X')).toBe(true);
  });

  it('normalizza ISBN-10 in ISBN-13', () => {
    expect(normalizeIsbn('0-306-40615-2')).toBe('9780306406157');
  });

  it('restituisce null per valori non validi o vuoti', () => {
    expect(normalizeIsbn('')).toBeNull();
    expect(normalizeIsbn(null)).toBeNull();
    expect(normalizeIsbn('abc')).toBeNull();
    expect(normalizeIsbn('9780306406158')).toBeNull();
  });

  it('formatta per la UI', () => {
    expect(formatIsbn13('9780306406157')).toBe('978-030640615-7');
    expect(formatIsbn13('x')).toBe('x');
  });
});
