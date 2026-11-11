import { normalizeTagList, normalizeTagName, parseTagInput } from '../tags';

describe('tags', () => {
  it('normalizza il nome', () => {
    expect(normalizeTagName('  Dinosauri  ')).toBe('dinosauri');
    expect(normalizeTagName('Regalo   Nonna')).toBe('regalo nonna');
    expect(normalizeTagName('   ')).toBe('');
  });

  it("rimuove duplicati e vuoti mantenendo l'ordine", () => {
    expect(normalizeTagList(['Animali', 'animali', '', ' Buonanotte '])).toEqual([
      'animali',
      'buonanotte',
    ]);
  });

  it("divide l'input utente su virgole, punto e virgola e a capo", () => {
    expect(parseTagInput('animali, dinosauri; buonanotte\nscuola')).toEqual([
      'animali',
      'dinosauri',
      'buonanotte',
      'scuola',
    ]);
  });
});
