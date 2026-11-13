import NetInfo from '@react-native-community/netinfo';

import { GoogleBooksProvider } from './GoogleBooksProvider';
import type { MetadataService } from './MetadataProvider';
import { MergingMetadataService } from './MetadataService';
import { OpenLibraryProvider } from './OpenLibraryProvider';
import { SbnProvider } from './SbnProvider';

/** Solo `isConnected === false` conta come offline: `isInternetReachable` dà falsi negativi. */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false;
}

/** Servizio metadati dell'app: Google Books, OPAC SBN e Open Library, uniti. */
export function createAppMetadataService(
  getGoogleApiKey: () => Promise<string | null>,
): MetadataService {
  return new MergingMetadataService({
    providers: [
      new GoogleBooksProvider({ getApiKey: getGoogleApiKey }),
      new SbnProvider(),
      new OpenLibraryProvider(),
    ],
    isOnline,
    onError: (source, err) => {
      if (__DEV__) console.warn(`[metadata] ${source}:`, err);
    },
  });
}
