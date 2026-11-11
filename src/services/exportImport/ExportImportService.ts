import {
  buildLibraryExport,
  EXPORT_MIME_TYPE,
  exportedToBook,
  exportFileName,
  parseLibraryExport,
  type ImportStrategy,
  type LibraryExport,
} from '@/domain/export';
import type { Book, ImportResult } from '@/domain/types';

import type { Repositories } from '@/data/repositories';

import type { CoverService } from '../covers/CoverService';
import { joinUri, type FilePort } from '../files/FilePort';

export interface ExportOptions {
  /** Include le copertine in base64 (file più grande). Default: true. */
  includeCovers?: boolean;
  /** Apre la share sheet dopo la scrittura. Default: true. */
  share?: boolean;
  now?: Date;
}

export interface ExportSummary {
  uri: string;
  fileName: string;
  books: number;
  covers: number;
}

/** Anteprima di un file scelto per l'import, prima di applicarlo. */
export interface ImportPreview {
  data: LibraryExport;
  fileName: string;
  total: number;
  /** Libri che non esistono ancora (né per id né per ISBN). */
  newBooks: number;
  /** Libri già presenti: la strategia decide se sostituirli o saltarli. */
  existing: number;
  /** Tipi di libro nel file che verranno creati. */
  newBookTypes: string[];
}

/**
 * Export (RF8) e import (RF9) del catalogo su file JSON.
 * Pura orchestrazione: formato nel dominio, dati nei repository, file tramite `FilePort`.
 */
export class ExportImportService {
  constructor(
    private readonly repos: Repositories,
    private readonly covers: CoverService,
    private readonly files: FilePort,
  ) {}

  async exportLibrary(options: ExportOptions = {}): Promise<ExportSummary> {
    const now = options.now ?? new Date();
    const [books, bookTypes] = await Promise.all([
      this.repos.books.findAll({ sort: 'createdAt' }),
      this.repos.bookTypes.findAll(),
    ]);

    const covers: Record<string, string> = {};
    if (options.includeCovers !== false) {
      for (const b of books) {
        const base64 = await this.covers.readBase64(b.coverPath);
        if (base64) covers[b.id] = base64;
      }
    }

    const doc = buildLibraryExport(books, bookTypes, covers, now);
    const fileName = exportFileName(now);
    const uri = joinUri(this.files.cacheDirectory, fileName);
    await this.files.writeText(uri, JSON.stringify(doc, null, 2));
    if (options.share !== false) await this.files.share(uri, EXPORT_MIME_TYPE);

    return { uri, fileName, books: books.length, covers: Object.keys(covers).length };
  }

  /** Apre il selettore e legge il file. `null` se l'utente annulla. Lancia `ExportFormatError` se non valido. */
  async pickImportFile(): Promise<ImportPreview | null> {
    const picked = await this.files.pickFile([EXPORT_MIME_TYPE, 'text/plain', '*/*']);
    if (!picked) return null;
    const text = await this.files.readText(picked.uri);
    return this.previewImport(text, picked.name);
  }

  /** Valida il contenuto e calcola l'anteprima rispetto al catalogo attuale. */
  async previewImport(jsonText: string, fileName = 'import.json'): Promise<ImportPreview> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = null;
    }
    const data = parseLibraryExport(parsed);

    const existingBooks = await this.repos.books.findAll();
    const ids = new Set(existingBooks.map((b) => b.id));
    const isbns = new Set(existingBooks.flatMap((b) => (b.isbn ? [b.isbn] : [])));
    const existing = data.books.filter(
      (b) => ids.has(b.id) || (b.isbn !== null && isbns.has(b.isbn)),
    ).length;

    const knownTypes = new Set(
      (await this.repos.bookTypes.findAll()).map((t) => t.name.toLocaleLowerCase('it-IT')),
    );
    const usedTypeNames = new Set(data.books.flatMap((b) => (b.bookType ? [b.bookType] : [])));
    const newBookTypes = [...usedTypeNames].filter(
      (n) => !knownTypes.has(n.toLocaleLowerCase('it-IT')),
    );

    return {
      data,
      fileName,
      total: data.books.length,
      newBooks: data.books.length - existing,
      existing,
      newBookTypes,
    };
  }

  /** Applica l'import: crea i tipi mancanti, unisce i libri, salva le copertine incluse. */
  async applyImport(data: LibraryExport, strategy: ImportStrategy): Promise<ImportResult> {
    const typeIdByName = await this.ensureBookTypes(data);

    const before = await this.repos.books.findAll();
    const existingIds = new Set(before.map((b) => b.id));
    const existingIdByIsbn = new Map(
      before.flatMap((b) => (b.isbn ? [[b.isbn, b.id] as const] : [])),
    );

    const books: Book[] = data.books.map((eb) => exportedToBook(eb, typeIdByName));
    const result = await this.repos.books.bulkUpsert(books, strategy);

    for (const eb of data.books) {
      if (!eb.coverBase64) continue;
      const targetId = existingIds.has(eb.id)
        ? eb.id
        : eb.isbn
          ? (existingIdByIsbn.get(eb.isbn) ?? eb.id)
          : eb.id;
      const wasExisting = existingIds.has(targetId);
      if (wasExisting && strategy === 'keep') continue;
      const stored = await this.repos.books.findById(targetId);
      if (!stored) continue;
      const path = await this.covers.storeBase64(eb.coverBase64, stored.id);
      if (path && stored.coverPath !== path)
        await this.repos.books.update(stored.id, { coverPath: path });
    }
    return result;
  }

  /** Crea i tipi di libro usati nel file che non esistono ancora. Restituisce la mappa nome (minuscolo) → id. */
  private async ensureBookTypes(data: LibraryExport): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const t of await this.repos.bookTypes.findAll())
      map.set(t.name.toLocaleLowerCase('it-IT'), t.id);
    const used = new Set(data.books.flatMap((b) => (b.bookType ? [b.bookType] : [])));
    for (const name of used) {
      const key = name.toLocaleLowerCase('it-IT');
      if (map.has(key)) continue;
      const created =
        (await this.repos.bookTypes.findByName(name)) ?? (await this.repos.bookTypes.create(name));
      map.set(key, created.id);
    }
    return map;
  }
}
