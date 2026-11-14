/** Date di sola giornata come stringhe `AAAA-MM-GG`, nel fuso del telefono. */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `Date` → `AAAA-MM-GG` usando il giorno locale (non UTC: vicino a mezzanotte cambierebbe giorno). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `AAAA-MM-GG` → `Date` a mezzogiorno locale, oppure null se non è una data reale. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  const m = value ? ISO_DATE_RE.exec(value) : null;
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return toIsoDate(date) === value ? date : null;
}

export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

/** `2026-11-14` → `14/11/2026`. Valori non validi restano invariati. */
export function formatDateIt(value: string | null | undefined): string {
  const m = value ? ISO_DATE_RE.exec(value) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (value ?? '');
}

export function todayIso(): string {
  return toIsoDate(new Date());
}
