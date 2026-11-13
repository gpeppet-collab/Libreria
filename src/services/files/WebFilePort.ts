import type { FilePort, ImageSource, PickedFile } from './FilePort';

/** Contenuto di un "file" sul web: testo, base64, oppure riferimento a un URL remoto (copertine). */
type Entry =
  | { kind: 'text'; value: string }
  | { kind: 'base64'; value: string }
  | { kind: 'url'; value: string };

const STORAGE_KEY = 'libreria.webfiles';

/**
 * `FilePort` per l'anteprima web. Il browser non ha un file system dell'app:
 * - i file stanno in memoria e in `localStorage` (quando c'è spazio), così le copertine
 *   sopravvivono al ricaricamento come il database (che expo-sqlite tiene in OPFS);
 * - una copertina scaricata resta l'URL remoto (niente CORS da gestire);
 * - la condivisione scarica il file, la scelta usa `<input type="file">`.
 */
export class WebFilePort implements FilePort {
  readonly documentDirectory = 'web://documents/';
  readonly cacheDirectory = 'web://cache/';
  private readonly files: Map<string, Entry>;

  constructor() {
    this.files = new Map(load());
  }

  async ensureDirectory(): Promise<void> {}

  async exists(uri: string): Promise<boolean> {
    return this.files.has(uri);
  }

  async readText(uri: string): Promise<string> {
    const e = this.get(uri);
    if (e.kind === 'text') return e.value;
    if (e.kind === 'base64') return atob(e.value);
    throw new Error(`Non è un file di testo: ${uri}`);
  }

  async writeText(uri: string, text: string): Promise<void> {
    this.set(uri, { kind: 'text', value: text }, !uri.startsWith(this.cacheDirectory));
  }

  async readBase64(uri: string): Promise<string> {
    const e = this.get(uri);
    if (e.kind === 'base64') return e.value;
    if (e.kind === 'text') return btoa(unescape(encodeURIComponent(e.value)));
    // Copertina remota: prova a scaricarla (riesce solo se il server consente CORS).
    const res = await fetch(e.value);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return blobToBase64(await res.blob());
  }

  async writeBase64(uri: string, base64: string): Promise<void> {
    this.set(uri, { kind: 'base64', value: base64 }, true);
  }

  async deleteFile(uri: string): Promise<void> {
    if (this.files.delete(uri)) save(this.files);
  }

  async download(url: string, destinationUri: string): Promise<void> {
    this.set(destinationUri, { kind: 'url', value: url }, true);
  }

  async share(uri: string, mimeType: string): Promise<void> {
    const text = await this.readText(uri);
    const href = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const a = document.createElement('a');
    a.href = href;
    a.download = uri.slice(uri.lastIndexOf('/') + 1);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  pickFile(mimeTypes: string[]): Promise<PickedFile | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = mimeTypes.filter((m) => m !== '*/*').join(',');
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        try {
          const uri = `${this.cacheDirectory}picked-${Date.now()}-${file.name}`;
          this.files.set(uri, { kind: 'text', value: await file.text() });
          resolve({ uri, name: file.name });
        } catch (err) {
          reject(err);
        }
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  /** Sul web non c'è distinzione tra fotocamera e galleria: decide il browser. */
  pickImage(_source: ImageSource): Promise<PickedFile | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        try {
          const uri = `${this.cacheDirectory}image-${Date.now()}-${file.name}`;
          this.files.set(uri, { kind: 'base64', value: await blobToBase64(file) });
          resolve({ uri, name: file.name });
        } catch (err) {
          reject(err);
        }
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  async copy(sourceUri: string, destinationUri: string): Promise<void> {
    this.set(destinationUri, this.get(sourceUri), true);
  }

  displayUri(uri: string): string | null {
    const e = this.files.get(uri);
    if (!e) return null;
    if (e.kind === 'url') return e.value;
    if (e.kind === 'base64') return `data:image/jpeg;base64,${e.value}`;
    return null;
  }

  private get(uri: string): Entry {
    const e = this.files.get(uri);
    if (!e) throw new Error(`File mancante: ${uri}`);
    return e;
  }

  private set(uri: string, entry: Entry, persist: boolean): void {
    this.files.set(uri, entry);
    if (persist) save(this.files);
  }
}

function load(): [string, Entry][] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as [string, Entry][]) : [];
  } catch {
    return [];
  }
}

function save(files: Map<string, Entry>): void {
  try {
    const persistent = [...files].filter(([uri]) => uri.startsWith('web://documents/'));
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(persistent));
  } catch {
    // Spazio esaurito: i file restano in memoria fino alla chiusura della pagina.
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
