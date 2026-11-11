import { categoriesToTags, cleanCoverUrl, extractYear } from '../parsing';

describe('parsing metadati', () => {
  it('estrae l anno da formati diversi', () => {
    expect(extractYear('2007-09-06')).toBe(2007);
    expect(extractYear('September 6, 2007')).toBe(2007);
    expect(extractYear('1998')).toBe(1998);
    expect(extractYear('n.d.')).toBeUndefined();
    expect(extractYear(undefined)).toBeUndefined();
  });

  it('pulisce l URL della copertina', () => {
    expect(cleanCoverUrl('http://books.google.com/x?id=1&edge=curl&img=1')).toBe(
      'https://books.google.com/x?id=1&img=1',
    );
    expect(cleanCoverUrl('')).toBeUndefined();
  });

  it('trasforma categorie gerarchiche in tag normalizzati e unici', () => {
    expect(
      categoriesToTags([
        'Juvenile Fiction / Animals / Foxes',
        'Juvenile Fiction',
        'Farmers -- Fiction',
      ]),
    ).toEqual(['juvenile fiction', 'animals', 'foxes', 'farmers', 'fiction']);
  });
});
