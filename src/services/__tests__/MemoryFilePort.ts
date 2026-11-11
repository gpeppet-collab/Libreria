import { joinUri, type FilePort, type PickedFile } from '../files/FilePort';

/** `FilePort` in memoria per i test: file come mappa uri → contenuto. */
export class MemoryFilePort implements FilePort {
  readonly documentDirectory = 'file:///app/documents/';
  readonly cacheDirectory = 'file:///app/cache/';
  readonly files = new Map<string, string>();
  readonly directories = new Set<string>();
  readonly shared: { uri: string; mimeType: string }[] = [];
  /** Risposte di `download` per URL: contenuto da scrivere oppure Error. */
  readonly downloads = new Map<string, string | Error>();
  /** File che `pickFile` restituirà (null = annullato). */
  nextPick: PickedFile | null = null;
  failWrites = false;

  async ensureDirectory(uri: string): Promise<void> {
    this.directories.add(uri);
  }
  async exists(uri: string): Promise<boolean> {
    return this.files.has(uri);
  }
  async readText(uri: string): Promise<string> {
    const v = this.files.get(uri);
    if (v === undefined) throw new Error(`file mancante: ${uri}`);
    return v;
  }
  async writeText(uri: string, text: string): Promise<void> {
    this.write(uri, text);
  }
  async readBase64(uri: string): Promise<string> {
    return this.readText(uri);
  }
  async writeBase64(uri: string, base64: string): Promise<void> {
    this.write(uri, base64);
  }
  async deleteFile(uri: string): Promise<void> {
    this.files.delete(uri);
  }
  async download(url: string, destinationUri: string): Promise<void> {
    const r = this.downloads.get(url);
    if (r === undefined) throw new Error(`download non configurato: ${url}`);
    if (r instanceof Error) throw r;
    this.write(destinationUri, r);
  }
  async share(uri: string, mimeType: string): Promise<void> {
    if (!this.files.has(uri)) throw new Error(`condivisione di un file inesistente: ${uri}`);
    this.shared.push({ uri, mimeType });
  }
  async pickFile(): Promise<PickedFile | null> {
    return this.nextPick;
  }

  /** Aggiunge un file nella cache come se l'utente lo avesse scelto. */
  stagePick(name: string, content: string): PickedFile {
    const uri = joinUri(this.cacheDirectory, `picked-${name}`);
    this.files.set(uri, content);
    this.nextPick = { uri, name };
    return this.nextPick;
  }

  private write(uri: string, content: string): void {
    if (this.failWrites) throw new Error('scrittura fallita');
    const dir = uri.slice(0, uri.lastIndexOf('/') + 1);
    if (
      !this.directories.has(dir) &&
      dir !== this.cacheDirectory &&
      dir !== this.documentDirectory
    ) {
      throw new Error(`cartella mancante: ${dir}`);
    }
    this.files.set(uri, content);
  }
}
