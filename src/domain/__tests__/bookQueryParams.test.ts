import { bookQueryToParams, countActiveFilters, parseBookQueryParams } from '../bookQueryParams';

describe('bookQueryParams', () => {
  it('ignora valori non validi e normalizza i tag', () => {
    expect(
      parseBookQueryParams({
        text: ' dino ',
        status: 'boh',
        ageRange: '3-5',
        bookTypeId: 'albo_illustrato',
        tags: 'Animali, ,buonanotte',
        sort: 'ageRange',
        direction: 'giù',
      }),
    ).toEqual({
      text: ' dino ',
      ageRange: '3-5',
      bookTypeId: 'albo_illustrato',
      tags: ['animali', 'buonanotte'],
      sort: 'ageRange',
    });
    expect(parseBookQueryParams({ status: ['letto', 'x'] })).toEqual({ status: 'letto' });
    expect(parseBookQueryParams({})).toEqual({});
  });

  it('fa il giro completo query → params → query', () => {
    const query = { status: 'letto' as const, tags: ['a', 'b'], direction: 'desc' as const };
    expect(bookQueryToParams(query)).toEqual({ status: 'letto', tags: 'a,b', direction: 'desc' });
    expect(parseBookQueryParams(bookQueryToParams(query))).toEqual(query);
  });

  it('conta i filtri attivi', () => {
    expect(countActiveFilters({})).toBe(0);
    expect(
      countActiveFilters({ text: 'x', sort: 'title', status: 'letto', tags: ['a', 'b'] }),
    ).toBe(3);
  });
});
