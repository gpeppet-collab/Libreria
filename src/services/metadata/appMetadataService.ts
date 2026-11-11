import NetInfo from '@react-native-community/netinfo';

import { GoogleBooksProvider } from './GoogleBooksProvider';
import type { MetadataService } from './MetadataProvider';
import { FallbackMetadataService } from './MetadataService';
import { OpenLibraryProvider } from './OpenLibraryProvider';

/** Verifica di connettività con NetInfo; in dubbio (stato sconosciuto) prova comunque. */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false && state.isInternetReachable !== false;
}

let instance: MetadataService | null = null;

/** Servizio metadati dell'app: Google Books, poi Open Library. */
export function getMetadataService(): MetadataService {
  if (!instance) {
    instance = new FallbackMetadataService({
      providers: [new GoogleBooksProvider(), new OpenLibraryProvider()],
      isOnline,
      onError: (source, err) => {
        if (__DEV__) console.warn(`[metadata] ${source}:`, err);
      },
    });
  }
  return instance;
}
