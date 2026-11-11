import { normalizeTagList } from '@/domain/tags';

/** Utilità di parsing condivise dai provider. Tolleranti: i dati remoti sono spesso incompleti. */

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function asPositiveInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asString).filter((s): s is string => s !== undefined)
    : [];
}

/** Estrae un anno plausibile da stringhe come "2019-03-05", "March 2019", "2019". */
export function extractYear(value: unknown): number | undefined {
  const s = asString(value);
  if (!s) return undefined;
  const m = /\b(1[5-9]\d{2}|20\d{2})\b/.exec(s);
  return m ? Number(m[1]) : undefined;
}

/** Forza https e rimuove parametri che degradano l'immagine di Google Books. */
export function cleanCoverUrl(value: unknown): string | undefined {
  const s = asString(value);
  if (!s) return undefined;
  return s.replace(/^http:\/\//, 'https://').replace(/&edge=curl/g, '');
}

export const MAX_SUGGESTED_TAGS = 10;

/**
 * Trasforma categorie gerarchiche ("Juvenile Fiction / Animals / Dinosaurs")
 * in tag suggeriti, normalizzati e senza duplicati.
 */
export function categoriesToTags(categories: readonly string[]): string[] {
  const parts = categories.flatMap((c) => c.split(/\s*[/,;>]\s*|\s+--\s+/));
  return normalizeTagList(parts).slice(0, MAX_SUGGESTED_TAGS);
}
