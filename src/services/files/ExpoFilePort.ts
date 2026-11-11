import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { FilePort, PickedFile } from './FilePort';

/** Implementazione di `FilePort` su expo-file-system, expo-sharing ed expo-document-picker. */
export class ExpoFilePort implements FilePort {
  readonly documentDirectory = withSlash(Paths.document.uri);
  readonly cacheDirectory = withSlash(Paths.cache.uri);

  async ensureDirectory(uri: string): Promise<void> {
    const dir = new Directory(uri);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  }

  async exists(uri: string): Promise<boolean> {
    return new File(uri).exists;
  }

  async readText(uri: string): Promise<string> {
    return new File(uri).text();
  }

  async writeText(uri: string, text: string): Promise<void> {
    await new File(uri).write(text, { encoding: 'utf8' });
  }

  async readBase64(uri: string): Promise<string> {
    return new File(uri).base64();
  }

  async writeBase64(uri: string, base64: string): Promise<void> {
    await new File(uri).write(base64, { encoding: 'base64' });
  }

  async deleteFile(uri: string): Promise<void> {
    const file = new File(uri);
    if (file.exists) file.delete();
  }

  async download(url: string, destinationUri: string): Promise<void> {
    await this.deleteFile(destinationUri);
    await File.downloadFileAsync(url, new File(destinationUri));
  }

  async share(uri: string, mimeType: string): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('La condivisione non è disponibile su questo dispositivo');
    }
    await Sharing.shareAsync(uri, { mimeType });
  }

  async pickFile(mimeTypes: string[]): Promise<PickedFile | null> {
    const res = await DocumentPicker.getDocumentAsync({
      type: mimeTypes,
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = res.canceled ? undefined : res.assets[0];
    return asset ? { uri: asset.uri, name: asset.name } : null;
  }
}

function withSlash(uri: string): string {
  return uri.endsWith('/') ? uri : `${uri}/`;
}
