import { normalizeTagList } from './tags';
import type { AgeRange } from './types';

/**
 * Suggerimenti di classificazione ricavati dai dati trovati online (RF24).
 * Sono euristiche su titolo, descrizione, categorie, editore e numero di pagine:
 * vanno sempre proposte all'utente, mai applicate in automatico.
 */
export interface ClassificationInput {
  title: string;
  description?: string | null;
  /** Categorie/soggetti delle fonti (anche in inglese). */
  categories?: readonly string[];
  publisher?: string | null;
  pageCount?: number | null;
}

export interface ClassificationSuggestion {
  ageRange: AgeRange | null;
  /** Id di uno dei tipi predefiniti (`BUILTIN_BOOK_TYPES`). */
  bookTypeId: string | null;
  tags: string[];
}

const norm = (s: string) => s.toLocaleLowerCase('it-IT').normalize('NFD').replace(/[̀-ͯ]/g, '');

function ageToRange(age: number): AgeRange {
  if (age < 3) return '0-2';
  if (age <= 5) return '3-5';
  if (age <= 8) return '6-8';
  if (age <= 12) return '9-12';
  return '13+';
}

/** Età dichiarata nel testo: "età di lettura: da 5 anni", "dai 3 anni", "da 18 mesi", "ages 4-8". */
export function extractDeclaredAge(text: string): AgeRange | null {
  const t = norm(text);
  if (/\b(?:da|dai|a partire da|a partire dai)\s+\d{1,2}\s+mesi\b/.test(t)) return '0-2';
  const m =
    /\beta(?: di lettura)?\s*:?\s*(?:da|dai)?\s*(\d{1,2})\s*anni/.exec(t) ??
    /\b(?:da|dai|a partire da|a partire dai)\s+(\d{1,2})\s+anni\b/.exec(t) ??
    /\b(\d{1,2})\s*\+\s*anni\b/.exec(t) ??
    /\bages?\s+(\d{1,2})\b/.exec(t);
  if (!m) return null;
  const age = Number(m[1]);
  return age >= 0 && age <= 18 ? ageToRange(age) : null;
}

/** Regole per il tipo, dalla più specifica alla più generica. La prima che corrisponde vince. */
const TYPE_RULES: readonly { type: string; pattern: RegExp }[] = [
  { type: 'fumetto', pattern: /\b(fumett\w*|graphic novel|comics?|manga|strisce|barzellette)\b/ },
  {
    type: 'gioco_attivita',
    pattern:
      /\b(pop-?up|alza e scopri|sticker|adesivi|stickers|da colorare|attivita|activity|giochi|labirinti|cerca e trova|libro gioco|con alette|sonoro|tattile)\b/,
  },
  { type: 'cartonato', pattern: /\b(cartonat\w*|board book|primi libri|primissimi)\b/ },
  {
    type: 'poesia',
    pattern: /\b(filastrocc\w*|poesi\w*|rime|ninne nanne|poetry|nursery rhymes)\b/,
  },
  {
    type: 'primo_lettore',
    pattern:
      /\b(prime letture|primi lettori|stampatello|early readers?|beginner readers?|leggo da solo)\b/,
  },
  {
    type: 'didattico',
    pattern:
      /\b(scolastic\w*|esercizi|quaderno|grammatica|sussidiario|compiti|textbooks?|study aids)\b/,
  },
  {
    type: 'divulgazione',
    pattern:
      /\b(atlante|enciclopedia|guida illustrata|scopri|scienza|natura|animali del mondo|come funziona|perche|juvenile nonfiction|nonfiction|storie vere|le 100)\b/,
  },
  { type: 'fiaba', pattern: /\b(fiab\w*|favol\w*|fairy tales?|folklore|c'era una volta)\b/ },
  {
    type: 'albo_illustrato',
    pattern:
      /\b(albo illustrat\w*|albi illustrati|picture books?|ediz\w*\.? illustrata|ediz\w*\.? a colori|libri illustrati)\b/,
  },
  {
    type: 'romanzo_ragazzi',
    pattern:
      /\b(romanzo per ragazzi|narrativa per ragazzi|young adult|juvenile fiction|children's stories)\b/,
  },
  { type: 'saggio', pattern: /\b(saggi\w*|essays?)\b/ },
];

/** Editori italiani con un catalogo molto caratterizzato: suggeriscono il tipo quando il testo non basta. */
const PUBLISHER_TYPES: readonly { pattern: RegExp; type: string }[] = [
  {
    pattern:
      /\b(babalibri|topipittori|zoolibri|orecchio acerbo|kite|camelozampa|terre di mezzo|lapis|emme|sassi|il castoro|minibombo|carthusia|kalandraka|logos|corraini)\b/,
    type: 'albo_illustrato',
  },
  {
    pattern:
      /\b(editoriale scienza|gribaudo|dk|dorling|national geographic|usborne|franco cosimo panini)\b/,
    type: 'divulgazione',
  },
  {
    pattern: /\b(tunue|bao publishing|panini comics|coconino|star comics|bonelli|beccogiallo)\b/,
    type: 'fumetto',
  },
  { pattern: /\b(ape junior|la coccinella|dami|giunti kids)\b/, type: 'gioco_attivita' },
];

/** Fascia d'età tipica per tipo, usata solo se il testo non dichiara un'età. */
const TYPE_DEFAULT_AGE: Readonly<Record<string, AgeRange>> = {
  cartonato: '0-2',
  albo_illustrato: '3-5',
  fiaba: '3-5',
  poesia: '3-5',
  primo_lettore: '6-8',
  romanzo_ragazzi: '9-12',
};

/** Argomenti riconosciuti: tag italiano e parole (italiane e inglesi) che lo indicano. */
const TOPIC_TAGS: readonly { tag: string; pattern: RegExp }[] = [
  {
    tag: 'animali',
    pattern: /\b(animal\w*|bestie|cuccioli|granchio|orso|lupo|volpe|gatt\w+|can[ei]|pets?)\b/,
  },
  { tag: 'dinosauri', pattern: /\b(dinosaur\w*)\b/ },
  {
    tag: 'buonanotte',
    pattern: /\b(buonanotte|ninna nanna|bedtime|sogni d'oro|il buio|del buio|e il buio|nanna)\b/,
  },
  {
    tag: 'emozioni',
    pattern: /\b(emozion\w*|paura|rabbia|tristezza|felicita|coraggio|feelings|emotions)\b/,
  },
  { tag: 'amicizia', pattern: /\b(amic\w+|friendship|friends)\b/ },
  { tag: 'famiglia', pattern: /\b(famiglia|mamma|papa|nonn\w+|fratell\w+|sorell\w+|family)\b/ },
  { tag: 'natale', pattern: /\b(natale|babbo natale|christmas)\b/ },
  { tag: 'scuola', pattern: /\b(scuola|maestr\w+|school)\b/ },
  { tag: 'natura', pattern: /\b(natura|bosco|foresta|mare|oceano|piante|alberi|nature)\b/ },
  { tag: 'spazio', pattern: /\b(spazio|stell[ae]|pianet\w+|astronaut\w+|luna|space|stars)\b/ },
  { tag: 'scienza', pattern: /\b(scienz\w+|esperiment\w+|science)\b/ },
  {
    tag: 'magia',
    pattern: /\b(magi\w+|stregh?\w*|fat[ae]|vampir\w+|incantesim\w+|magic|witches)\b/,
  },
  { tag: 'avventura', pattern: /\b(avventur\w+|adventure\w*|esplorator\w+)\b/ },
  { tag: 'mostri', pattern: /\b(mostr\w+|gruffalo|monsters?)\b/ },
  { tag: 'umorismo', pattern: /\b(umoris\w+|barzellette|divertent\w+|humou?r\w*|risate)\b/ },
  { tag: 'sport', pattern: /\b(sport|calcio|football|soccer)\b/ },
  { tag: 'musica', pattern: /\b(music\w*|canzon\w+|songs?)\b/ },
  { tag: 'pop-up', pattern: /\b(pop-?up)\b/ },
];

export function suggestClassification(
  input: ClassificationInput,
  existingTags: readonly string[] = [],
): ClassificationSuggestion {
  const categories = (input.categories ?? []).join(' ; ');
  const text = norm([input.title, input.description ?? '', categories].join(' \n '));
  const publisher = norm(input.publisher ?? '');
  const pages = input.pageCount ?? null;

  // Tipo: prima le parole nel testo, poi l'editore, infine il numero di pagine.
  let bookTypeId = TYPE_RULES.find((r) => r.pattern.test(text))?.type ?? null;
  bookTypeId ??= PUBLISHER_TYPES.find((p) => p.pattern.test(publisher))?.type ?? null;
  const juvenile = /\b(juvenile|children|bambin\w+|ragazz\w+|infanzia)\b/.test(text);
  if (!bookTypeId && juvenile && pages !== null)
    bookTypeId = pages <= 48 ? 'albo_illustrato' : 'romanzo_ragazzi';
  // Un "romanzo" di poche pagine illustrate è in realtà un albo.
  if (bookTypeId === 'romanzo_ragazzi' && pages !== null && pages <= 48)
    bookTypeId = 'albo_illustrato';

  // Fascia d'età: quella dichiarata nel testo, altrimenti quella tipica del tipo.
  let ageRange = extractDeclaredAge([input.title, input.description ?? ''].join(' \n '));
  if (!ageRange && /\byoung adult\b/.test(text)) ageRange = '13+';
  if (!ageRange && bookTypeId) ageRange = TYPE_DEFAULT_AGE[bookTypeId] ?? null;

  // Tag: argomenti riconosciuti, più i tag dell'utente che compaiono nel testo.
  const topics = TOPIC_TAGS.filter((t) => t.pattern.test(text)).map((t) => t.tag);
  const own = existingTags.filter((tag) => {
    const n = norm(tag);
    return (
      n.length >= 4 && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)
    );
  });
  return { ageRange, bookTypeId, tags: normalizeTagList([...own, ...topics]).slice(0, 8) };
}

/** Riduce una descrizione lunga alle prime frasi (circa `max` caratteri), senza troncare a metà frase. */
export function shortenDescription(text: string | null | undefined, max = 400): string | null {
  const clean = (text ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return null;
  if (clean.length <= max) return clean;
  const sentences = clean.match(/[^.!?…]+[.!?…]+/g) ?? [];
  let out = '';
  for (const s of sentences) {
    if ((out + s).length > max) break;
    out += s;
  }
  return (out.trim() || `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`).trim();
}
