import { cleanSbnAuthor, parseSbnPublication, parseSbnTitle, SbnProvider } from '../SbnProvider';
import { fakeFetch, ISBN, jsonResponse, SBN_RESPONSE } from './fixtures';

describe('SbnProvider', () => {
  it('mappa il primo record', async () => {
    const fetchFn = fakeFetch({ 'opac.sbn.it': async () => jsonResponse(SBN_RESPONSE) });
    const meta = await new SbnProvider(fetchFn).lookupByIsbn(ISBN);
    expect(fetchFn.calls).toEqual([`https://opac.sbn.it/opacmobilegw/search.json?isbn=${ISBN}`]);
    expect(meta).toEqual({
      isbn: ISBN,
      title: 'Furbo, il signor Volpe',
      authors: ['Roald Dahl'],
      publisher: 'Salani',
      publishedYear: 2016,
      coverUrl: undefined,
      source: 'sbn',
    });
  });

  it('restituisce null senza record e lancia su errore HTTP', async () => {
    const empty = new SbnProvider(
      fakeFetch({ 'opac.sbn.it': async () => jsonResponse({ numFound: 0, briefRecords: [] }) }),
    );
    expect(await empty.lookupByIsbn(ISBN)).toBeNull();
    const ko = new SbnProvider(fakeFetch({ 'opac.sbn.it': async () => jsonResponse({}, 500) }));
    await expect(ko.lookupByIsbn(ISBN)).rejects.toThrow('HTTP 500');
  });

  it('interpreta titolo, autore e pubblicazione in forma ISBD', () => {
    expect(
      parseSbnTitle('*Il gruffalò / Julia Donaldson ; illustrazioni di Axel Scheffler'),
    ).toEqual({
      title: 'Il gruffalò',
      authors: ['Julia Donaldson'],
    });
    expect(parseSbnTitle('Storie : per la buonanotte / testi di Anna Rossi')).toEqual({
      title: 'Storie: per la buonanotte',
      authors: [],
    });
    expect(parseSbnTitle('Solo titolo')).toEqual({ title: 'Solo titolo', authors: [] });
    expect(cleanSbnAuthor('Donaldson, Julia <1948- >')).toBe('Julia Donaldson');
    expect(cleanSbnAuthor('Geronimo Stilton')).toBe('Geronimo Stilton');
    expect(cleanSbnAuthor(undefined)).toBeUndefined();
    expect(parseSbnPublication('Trieste : Emme, 2010')).toEqual({ publisher: 'Emme', year: 2010 });
    expect(parseSbnPublication('Milano : Mondadori, stampa 2019')).toEqual({
      publisher: 'Mondadori',
      year: 2019,
    });
    expect(parseSbnPublication(undefined)).toEqual({});
  });
});
