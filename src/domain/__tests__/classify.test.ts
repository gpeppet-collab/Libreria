import { extractDeclaredAge, shortenDescription, suggestClassification } from '../classify';

describe('classify', () => {
  it('riconosce l età dichiarata', () => {
    expect(extractDeclaredAge('Età di lettura: da 5 anni.')).toBe('3-5');
    expect(extractDeclaredAge('Un libro per bambini dai 3 anni in su')).toBe('3-5');
    expect(extractDeclaredAge('A partire da 18 mesi')).toBe('0-2');
    expect(extractDeclaredAge('Da 7 anni')).toBe('6-8');
    expect(extractDeclaredAge('Consigliato 10+ anni')).toBe('9-12');
    expect(extractDeclaredAge('For ages 14 and up')).toBe('13+');
    expect(extractDeclaredAge('Pubblicato da 30 anni')).toBeNull();
    expect(extractDeclaredAge('Nessuna indicazione')).toBeNull();
  });

  // Casi presi da libri reali del catalogo: titolo, editore e pagine come arrivano dalle fonti.
  it.each([
    [
      { title: 'Dinosauri. Un libro pop-up. Ediz. a colori', publisher: 'Ape Junior' },
      'gioco_attivita',
      null,
      ['dinosauri', 'pop-up'],
    ],
    [
      { title: 'Scopri il mondo dei dinosauri. Alza e scopri', publisher: 'Editoriale Scienza' },
      'gioco_attivita',
      null,
      ['dinosauri'],
    ],
    [
      {
        title: "L'atlante degli animali. Una guida illustrata",
        publisher: 'Gribaudo',
        pageCount: 64,
      },
      'divulgazione',
      null,
      ['animali'],
    ],
    [
      {
        title: 'Così come sono. Ediz. illustrata',
        publisher: 'Franco Cosimo Panini',
        pageCount: 32,
      },
      'albo_illustrato',
      '3-5',
      [],
    ],
    [{ title: 'Papà-isola', publisher: 'Babalibri' }, 'albo_illustrato', '3-5', ['famiglia']],
    [{ title: 'Divertimenti', publisher: 'Tunué' }, 'fumetto', null, []],
    [
      { title: 'Orion e il buio. Ediz. a colori', publisher: 'Sassi, ©' },
      'albo_illustrato',
      '3-5',
      ['buonanotte'],
    ],
    [
      { title: 'Amici per sempre. Storie vere di animali', publisher: 'Moon', pageCount: 92 },
      'divulgazione',
      null,
      ['animali', 'amicizia'],
    ],
  ])('suggerisce tipo, fascia e tag per %j', (input, type, age, tags) => {
    const s = suggestClassification(input);
    expect(s.bookTypeId).toBe(type);
    expect(s.ageRange).toBe(age);
    expect(s.tags).toEqual(tags);
  });

  it('usa categorie in inglese, descrizione e tag dell utente', () => {
    const s = suggestClassification(
      {
        title: 'Fantastic Mr Fox',
        description: 'Età di lettura: da 8 anni. La volpe più furba contro tre contadini.',
        categories: ['Juvenile Fiction / Animals / Foxes'],
        pageCount: 96,
      },
      ['contadini', 'bo'],
    );
    expect(s).toEqual({
      ageRange: '6-8',
      bookTypeId: 'romanzo_ragazzi',
      tags: ['contadini', 'animali'],
    });
    expect(
      suggestClassification({ title: 'Storia', categories: ['Juvenile Fiction'], pageCount: 32 })
        .bookTypeId,
    ).toBe('albo_illustrato');
  });

  it('senza indizi non suggerisce nulla', () => {
    expect(suggestClassification({ title: 'Titolo qualsiasi' })).toEqual({
      ageRange: null,
      bookTypeId: null,
      tags: [],
    });
  });

  it('accorcia la descrizione alle prime frasi e toglie l HTML', () => {
    expect(
      shortenDescription('<p>Prima frase.</p> Seconda&nbsp;frase! Terza frase molto lunga.', 30),
    ).toBe('Prima frase. Seconda frase!');
    expect(shortenDescription('Breve.')).toBe('Breve.');
    expect(shortenDescription('  ')).toBeNull();
    expect(shortenDescription('parola '.repeat(30), 20)).toBe('parola parola…');
  });
});
