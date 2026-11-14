import { joinUri, type FilePort, type ImageSource } from '../files/FilePort';

export const COVERS_DIR_NAME = 'covers';

export interface CoverServiceOptions {
  /** Notifica degli errori ignorati (log). */
  onError?: (error: unknown) => void;
}

/**
 * Copertine salvate in locale (RNF7), una per libro: `<documentDirectory>/covers/<bookId>.jpg`.
 * Nessun metodo lancia verso la UI: in caso di errore restituisce null o non fa nulla.
 */
export class CoverService {
  readonly directory: string;
  private readonly onError: (error: unknown) => void;

  constructor(
    private readonly files: FilePort,
    options: CoverServiceOptions = {},
  ) {
    this.directory = joinUri(files.documentDirectory, `${COVERS_DIR_NAME}/`);
    this.onError = options.onError ?? (() => {});
  }

  /** URI da passare a `<Image>` per una copertina salvata. */
  displayUri(path: string | null): string | null {
    if (!path) return null;
    return this.files.displayUri ? this.files.displayUri(path) : path;
  }

  pathFor(bookId: string): string {
    return joinUri(this.directory, `${bookId}.jpg`);
  }

  /** Scarica la copertina e restituisce il path locale, oppure null. */
  async download(url: string, bookId: string): Promise<string | null> {
    // Nome unico: `<Image>` tiene in cache per indirizzo e mostrerebbe una copertina sostituita.
    const dest = joinUri(this.directory, `${bookId}-${Date.now()}.jpg`);
    try {
      await this.files.ensureDirectory(this.directory);
      await this.files.download(url, dest);
      return dest;
    } catch (err) {
      this.onError(err);
      await this.files.deleteFile(dest).catch(() => {});
      return null;
    }
  }

  /**
   * Prova i candidati in ordine e restituisce il path locale del primo scaricato.
   * Se nessuno si scarica restituisce il primo URL remoto (se `allowRemote`), così la copertina
   * si vede comunque quando c'è rete; altrimenti null.
   */
  async downloadFirst(
    urls: readonly string[],
    bookId: string,
    allowRemote = true,
  ): Promise<string | null> {
    for (const url of urls) {
      const path = await this.download(url, bookId);
      if (path) return path;
    }
    // L'ultimo candidato è spesso un tentativo "alla cieca": come remoto si usa solo il primo.
    return allowRemote && urls.length > 1 ? (urls[0] ?? null) : null;
  }

  /** Fa scattare o scegliere un'immagine. Restituisce un URI temporaneo, oppure null. */
  async pickImage(source: ImageSource): Promise<string | null> {
    try {
      return (await this.files.pickImage(source))?.uri ?? null;
    } catch (err) {
      this.onError(err);
      return null;
    }
  }

  /**
   * Salva come copertina del libro un'immagine scelta dall'utente ed elimina la precedente.
   * Il nome contiene un timestamp: così `<Image>` non mostra dalla cache la copertina vecchia.
   */
  async storeFromFile(
    sourceUri: string,
    bookId: string,
    previousPath: string | null = null,
  ): Promise<string | null> {
    const dest = joinUri(this.directory, `${bookId}-${Date.now()}.jpg`);
    try {
      await this.files.ensureDirectory(this.directory);
      await this.files.copy(sourceUri, dest);
      if (previousPath !== dest) await this.remove(previousPath);
      return dest;
    } catch (err) {
      this.onError(err);
      return null;
    }
  }

  /** Salva una copertina ricevuta in base64 (import) e restituisce il path locale, oppure null. */
  async storeBase64(base64: string, bookId: string): Promise<string | null> {
    const dest = this.pathFor(bookId);
    try {
      await this.files.ensureDirectory(this.directory);
      await this.files.writeBase64(dest, base64);
      return dest;
    } catch (err) {
      this.onError(err);
      return null;
    }
  }

  /** Legge la copertina in base64 (export), oppure null se manca o non leggibile. */
  async readBase64(path: string | null): Promise<string | null> {
    if (!path) return null;
    try {
      if (!(await this.files.exists(path))) return null;
      return await this.files.readBase64(path);
    } catch (err) {
      this.onError(err);
      return null;
    }
  }

  /** Elimina il file, solo se si trova nella cartella delle copertine. */
  async remove(path: string | null): Promise<void> {
    if (!path || !path.startsWith(this.directory)) return;
    try {
      await this.files.deleteFile(path);
    } catch (err) {
      this.onError(err);
    }
  }
}
