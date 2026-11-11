/**
 * Regole sui nomi dei tag.
 * I tag sono confrontati in modo case-insensitive e salvati normalizzati.
 */

export const TAG_MAX_LENGTH = 40;

/** trim, minuscolo, spazi multipli ridotti a uno. Restituisce '' se vuoto. */
export function normalizeTagName(raw: string): string {
  return raw.trim().toLocaleLowerCase('it-IT').replace(/\s+/g, ' ').slice(0, TAG_MAX_LENGTH);
}

/** Normalizza una lista di tag e rimuove duplicati e vuoti, preservando l'ordine. */
export function normalizeTagList(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const name = normalizeTagName(r);
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** Divide una stringa inserita dall'utente ("animali, dinosauri; buonanotte") in tag. */
export function parseTagInput(input: string): string[] {
  return normalizeTagList(input.split(/[,;\n]/));
}
