import { normalizeTagName } from '@/domain/tags';
import type { Tag } from '@/domain/types';

import { NotFoundError, ValidationError } from './errors';
import { newId, nowIso } from './ids';
import { likeStartsWith } from './sql';
import type { SqlDatabase } from './SqlDatabase';
import type { TagRepository } from './TagRepository';

interface TagRow {
  id: string;
  name: string;
  book_count: number;
}

const SELECT_TAGS = `
  SELECT t.id, t.name, COUNT(bt.book_id) AS book_count
  FROM tags t LEFT JOIN book_tags bt ON bt.tag_id = t.id`;

export class SqliteTagRepository implements TagRepository {
  constructor(private readonly db: SqlDatabase) {}

  async findAll(): Promise<Tag[]> {
    const rows = await this.db.getAllAsync<TagRow>(
      `${SELECT_TAGS} GROUP BY t.id ORDER BY t.name COLLATE NOCASE`,
      [],
    );
    return rows.map(toTag);
  }

  async suggest(prefix: string, limit = 10): Promise<Tag[]> {
    const p = normalizeTagName(prefix);
    const rows = await this.db.getAllAsync<TagRow>(
      `${SELECT_TAGS} WHERE t.name LIKE ? ESCAPE '\\'
       GROUP BY t.id ORDER BY book_count DESC, t.name COLLATE NOCASE LIMIT ?`,
      [likeStartsWith(p), limit],
    );
    return rows.map(toTag);
  }

  async rename(id: string, name: string): Promise<Tag> {
    const newName = normalizeTagName(name);
    if (!newName) throw new ValidationError('Il nome del tag è obbligatorio');

    let resultId = id;
    await this.db.withTransactionAsync(async () => {
      const current = await this.db.getFirstAsync<{ id: string }>(
        'SELECT id FROM tags WHERE id = ?',
        [id],
      );
      if (!current) throw new NotFoundError('Tag', id);

      const target = await this.db.getFirstAsync<{ id: string }>(
        'SELECT id FROM tags WHERE name = ? AND id <> ?',
        [newName, id],
      );
      if (target) {
        // Unione: sposta le associazioni sul tag esistente ed elimina quello rinominato.
        await this.db.runAsync(
          'INSERT OR IGNORE INTO book_tags (book_id, tag_id) SELECT book_id, ? FROM book_tags WHERE tag_id = ?',
          [target.id, id],
        );
        await this.db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
        resultId = target.id;
      } else {
        await this.db.runAsync('UPDATE tags SET name = ? WHERE id = ?', [newName, id]);
      }
    });
    return this.mustFind(resultId);
  }

  async remove(id: string): Promise<void> {
    const res = await this.db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
    if (res.changes === 0) throw new NotFoundError('Tag', id);
  }

  /** Crea il tag se non esiste e lo restituisce. */
  async ensure(name: string): Promise<Tag> {
    const n = normalizeTagName(name);
    if (!n) throw new ValidationError('Il nome del tag è obbligatorio');
    await this.db.runAsync('INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)', [
      newId(),
      n,
      nowIso(),
    ]);
    const row = await this.db.getFirstAsync<TagRow>(
      `${SELECT_TAGS} WHERE t.name = ? GROUP BY t.id`,
      [n],
    );
    if (!row) throw new NotFoundError('Tag', n);
    return toTag(row);
  }

  private async mustFind(id: string): Promise<Tag> {
    const row = await this.db.getFirstAsync<TagRow>(`${SELECT_TAGS} WHERE t.id = ? GROUP BY t.id`, [
      id,
    ]);
    if (!row) throw new NotFoundError('Tag', id);
    return toTag(row);
  }
}

function toTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, bookCount: row.book_count };
}
