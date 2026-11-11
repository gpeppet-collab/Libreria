/**
 * Porta minima verso il file system, la condivisione e la scelta di file.
 * I servizi dipendono solo da questa interfaccia: l'app usa `ExpoFilePort`,
 * i test `MemoryFilePort`. Gli URI sono stringhe `file://…` con cartelle che terminano in `/`.
 */
export interface PickedFile {
  uri: string;
  name: string;
}

export interface FilePort {
  /** Cartella persistente dell'app (sopravvive ai riavvii). */
  readonly documentDirectory: string;
  /** Cartella temporanea: file di export da condividere. */
  readonly cacheDirectory: string;

  ensureDirectory(uri: string): Promise<void>;
  exists(uri: string): Promise<boolean>;
  readText(uri: string): Promise<string>;
  writeText(uri: string, text: string): Promise<void>;
  readBase64(uri: string): Promise<string>;
  writeBase64(uri: string, base64: string): Promise<void>;
  /** Non fallisce se il file non esiste. */
  deleteFile(uri: string): Promise<void>;
  /** Scarica `url` in `destinationUri`, sovrascrivendo. Lancia in caso di errore. */
  download(url: string, destinationUri: string): Promise<void>;
  /** Apre la share sheet di sistema. */
  share(uri: string, mimeType: string): Promise<void>;
  /** Apre il selettore di file. `null` se l'utente annulla. */
  pickFile(mimeTypes: string[]): Promise<PickedFile | null>;
}

export function joinUri(directory: string, name: string): string {
  return directory.endsWith('/') ? `${directory}${name}` : `${directory}/${name}`;
}
