import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

import type { FilePort, ImageSource, PickedFile } from './FilePort';

const MIN_IMAGE_BYTES = 1024;

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
    const file = new File(destinationUri);
    try {
      await File.downloadFileAsync(url, file, { idempotent: true });
    } catch {
      // Ripiego: scarica in memoria e scrive i byte (alcuni server non piacciono al download nativo).
      await this.deleteFile(destinationUri);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await file.write(new Uint8Array(await res.arrayBuffer()));
    }
    // Un file minuscolo non è una copertina (es. segnaposto 1x1 o pagina di errore).
    if (!file.exists || file.size < MIN_IMAGE_BYTES) {
      await this.deleteFile(destinationUri);
      throw new Error('Immagine non valida');
    }
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

  async pickImage(source: ImageSource): Promise<PickedFile | null> {
    // Ritaglio in proporzione copertina e compressione: file piccoli, lista veloce.
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.6,
    };
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return null;
    }
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = res.canceled ? undefined : res.assets[0];
    return asset ? { uri: asset.uri, name: asset.fileName ?? 'copertina.jpg' } : null;
  }

  async copy(sourceUri: string, destinationUri: string): Promise<void> {
    await this.deleteFile(destinationUri);
    await new File(sourceUri).copy(new File(destinationUri));
  }
}

function withSlash(uri: string): string {
  return uri.endsWith('/') ? uri : `${uri}/`;
}
