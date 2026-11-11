/**
 * Normalizzazione e validazione ISBN.
 *
 * Tutto il sistema memorizza l'ISBN come 13 cifre senza trattini.
 * Un ISBN-10 valido viene convertito in ISBN-13 (prefisso 978).
 */

const ISBN_PREFIXES = ['978', '979'] as const;

/** Rimuove trattini, spazi e prefissi tipo "ISBN". Non valida. */
export function cleanIsbn(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/^ISBN[-:\s]*/i, '')
    .replace(/[-\s]/g, '');
}

export function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = value[i] as string;
    const digit = ch === 'X' ? 10 : Number(ch);
    sum += digit * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  if (!ISBN_PREFIXES.some((p) => value.startsWith(p))) return false;
  return isbn13CheckDigit(value.slice(0, 12)) === value[12];
}

/** Calcola la cifra di controllo per le prime 12 cifre di un ISBN-13. */
export function isbn13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(first12[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

export function isbn10ToIsbn13(isbn10: string): string {
  const core = '978' + isbn10.slice(0, 9);
  return core + isbn13CheckDigit(core);
}

/**
 * Restituisce l'ISBN-13 normalizzato, oppure null se il valore non è un ISBN valido.
 * Accetta ISBN-10, ISBN-13 e codici EAN-13 letti dallo scanner.
 */
export function normalizeIsbn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = cleanIsbn(raw);
  if (isValidIsbn13(value)) return value;
  if (isValidIsbn10(value)) return isbn10ToIsbn13(value);
  return null;
}

/** Formatta un ISBN-13 con i trattini nei punti canonici più comuni (solo per la UI). */
export function formatIsbn13(isbn13: string): string {
  if (!/^\d{13}$/.test(isbn13)) return isbn13;
  return `${isbn13.slice(0, 3)}-${isbn13.slice(3, 12)}-${isbn13.slice(12)}`;
}
