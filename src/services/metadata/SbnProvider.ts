import {
  METADATA_ENDPOINTS,
  type BookMetadata,
  type FetchFn,
  type MetadataProvider,
} from './MetadataProvider';
import { asString, cleanCoverUrl, extractYear } from './parsing';

/** Forma (parziale) della risposta del catalogo SBN. */
interface SbnResponse {
  numFound?: unknown;
  briefRecords?: SbnRecord[];
}
interface SbnRecord {
  titolo?: unknown;
  autorePrincipale?: unknown;
  pubblicazione?: unknown;
  copertina?: unknown;
}

/**
 * OPAC SBN, il catalogo del Servizio Bibliotecario Nazionale: copre bene l'editoria italiana,
 * compresi i libri per bambini assenti dalle altre fonti. Non fornisce descrizione né categorie.
 */
export class SbnProvider implements MetadataProvider {
  readonly source = 'sbn' as const;

  constructor(private readonly fetchFn: FetchFn = (input, init) => fetch(input, init)) {}

  async lookupByIsbn(isbn: string, signal?: AbortSignal): Promise<BookMetadata | null> {
    const res = await this.fetchFn(METADATA_ENDPOINTS.sbn(isbn), { signal });
    if (!res.ok) throw new Error(`SBN HTTP ${res.status}`);
    const body = (await res.json()) as SbnResponse;
    const record = body.briefRecords?.[0];
    if (!record) return null;

    const parsed = parseSbnTitle(asString(record.titolo) ?? '');
    if (!parsed.title) return null;
    const mainAuthor = cleanSbnAuthor(asString(record.autorePrincipale));
    const publication = parseSbnPublication(asString(record.pubblicazione));
    const cover = cleanCoverUrl(record.copertina);

    return {
      isbn,
      title: parsed.title,
      authors: mainAuthor ? [mainAuthor] : parsed.authors,
      publisher: publication.publisher,
      publishedYear: publication.year,
      coverUrl: cover?.startsWith('https://') ? cover : undefined,
      source: this.source,
    };
  }
}

/**
 * Titolo in forma ISBD: "Il gruffalò / Julia Donaldson ; illustrazioni di Axel Scheffler".
 * Prima di " / " c'è il titolo (con " : " per il sottotitolo), dopo la formulazione di responsabilità.
 */
export function parseSbnTitle(raw: string): { title: string; authors: string[] } {
  const [titlePart = '', responsibility = ''] = raw.split(/\s+\/\s+/, 2);
  const title = titlePart
    .replace(/^\*/, '')
    .replace(/\s+:\s+/g, ': ')
    .replace(/\s+/g, ' ')
    .trim();
  const first = responsibility.split(/\s*;\s*/)[0]?.trim() ?? '';
  // Si usa come autore solo se sembra un nome e non una frase ("illustrazioni di…").
  const authors =
    first && !/\b(di|da|a cura|illustra|tradu|testi|disegni)\b/i.test(first) ? [first] : [];
  return { title, authors };
}

/** "Donaldson, Julia <1948- >" → "Julia Donaldson". */
export function cleanSbnAuthor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const name = raw
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const [last, first] = name.split(/\s*,\s*/, 2);
  if (!last) return undefined;
  return first ? `${first} ${last}` : last;
}

/** "Trieste : Emme, 2010" → editore "Emme", anno 2010. */
export function parseSbnPublication(raw: string | undefined): {
  publisher?: string;
  year?: number;
} {
  if (!raw) return {};
  const afterPlace = raw.includes(' : ') ? raw.slice(raw.indexOf(' : ') + 3) : raw;
  const publisher = afterPlace
    .replace(/[,.]?\s*\[?(c|stampa\s+)?\d{4}\]?.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { publisher: publisher || undefined, year: extractYear(raw) };
}
