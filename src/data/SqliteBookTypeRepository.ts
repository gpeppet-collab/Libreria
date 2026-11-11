import type { BookType } from '@/domain/types';

import type { BookTypeRepository } from './BookTypeRepository';
import { BuiltinTypeError, DuplicateNameError, NotFoundError, ValidationError } from './errors';
import { newId } from './ids';
import type { SqlDatabase } from './SqlDatabase';

interface BookTypeRow {
  id: string;
  name: string;
  builtin: number;
  sort_order: number;
}

/** I tipi creati dall'utente si ordinano dopo i predefiniti ma prima di "Altro" (999). */
const USER_TYPE_SORT_BASE = 500;

export class SqliteBookTypeRepository implements BookTypeRepository {
  constructor(private readonly db: SqlDatabase) {}

  async findAll(): Promise<BookType[]> {
    const rows = await this.db.getAllAsync<BookTypeRow>(
      'SELECT * FROM book_types ORDER BY sort_order, name COLLATE NOCASE',
      [],
    );
    return rows.map(toBookType);
  }

  async findByName(name: string): Promise<BookType | null> {
    const row = await this.db.getFirstAsync<BookTypeRow>(
      'SELECT * FROM book_types WHERE name = ?',
      [cleanName(name)],
    );
    return row ? toBookType(row) : null;
  }

  async create(name: string): Promise<BookType> {
    const n = cleanName(name);
    if (!n) throw new ValidationError('Il nome del tipo è obbligatorio');
    const id = newId();
    await this.db.withTransactionAsync(async () => {
      const dup = await this.db.getFirstAsync<{ id: string }>(
        'SELECT id FROM book_types WHERE name = ?',
        [n],
      );
      if (dup) throw new DuplicateNameError('Tipo di libro', dup.id);
      const max = await this.db.getFirstAsync<{ m: number | null }>(
        'SELECT MAX(sort_order) AS m FROM book_types WHERE builtin = 0',
        [],
      );
      const sortOrder = (max?.m ?? USER_TYPE_SORT_BASE) + 10;
      await this.db.runAsync(
        'INSERT INTO book_types (id, name, builtin, sort_order) VALUES (?, ?, 0, ?)',
        [id, n, sortOrder],
      );
    });
    return this.mustFind(id);
  }

  async rename(id: string, name: string): Promise<BookType> {
    const n = cleanName(name);
    if (!n) throw new ValidationError('Il nome del tipo è obbligatorio');
    await this.db.withTransactionAsync(async () => {
      const current = await this.db.getFirstAsync<{ id: string }>(
        'SELECT id FROM book_types WHERE id = ?',
        [id],
      );
      if (!current) throw new NotFoundError('Tipo di libro', id);
      const dup = await this.db.getFirstAsync<{ id: string }>(
        'SELECT id FROM book_types WHERE name = ? AND id <> ?',
        [n, id],
      );
      if (dup) throw new DuplicateNameError('Tipo di libro', dup.id);
      await this.db.runAsync('UPDATE book_types SET name = ? WHERE id = ?', [n, id]);
    });
    return this.mustFind(id);
  }

  async remove(id: string): Promise<void> {
    const row = await this.db.getFirstAsync<BookTypeRow>('SELECT * FROM book_types WHERE id = ?', [
      id,
    ]);
    if (!row) throw new NotFoundError('Tipo di libro', id);
    if (row.builtin) throw new BuiltinTypeError(id);
    // I libri associati restano senza tipo (ON DELETE SET NULL).
    await this.db.runAsync('DELETE FROM book_types WHERE id = ?', [id]);
  }

  private async mustFind(id: string): Promise<BookType> {
    const row = await this.db.getFirstAsync<BookTypeRow>('SELECT * FROM book_types WHERE id = ?', [
      id,
    ]);
    if (!row) throw new NotFoundError('Tipo di libro', id);
    return toBookType(row);
  }
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function toBookType(row: BookTypeRow): BookType {
  return { id: row.id, name: row.name, builtin: row.builtin === 1, sortOrder: row.sort_order };
}
