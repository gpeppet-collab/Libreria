import { getRepositories } from '@/data/appRepositories';
import type { Repositories } from '@/data/repositories';
import { SETTING_GOOGLE_BOOKS_API_KEY } from '@/data/SettingsRepository';

import { CoverService } from './covers/CoverService';
import { ExportImportService } from './exportImport/ExportImportService';
import { createFilePort } from './files/createFilePort';
import { createAppMetadataService } from './metadata/appMetadataService';
import type { MetadataService } from './metadata/MetadataProvider';

export interface AppServices {
  repos: Repositories;
  covers: CoverService;
  exportImport: ExportImportService;
  metadata: MetadataService;
}

let instance: Promise<AppServices> | null = null;

/**
 * Servizi dell'app, costruiti una sola volta sul database e sul file system reali.
 * L'eliminazione di un libro cancella anche la sua copertina locale.
 */
export function getAppServices(): Promise<AppServices> {
  if (!instance) {
    instance = (async () => {
      const files = createFilePort();
      const covers = new CoverService(files, {
        onError: (err) => {
          if (__DEV__) console.warn('[covers]', err);
        },
      });
      const repos = await getRepositories({
        onBookRemoved: (book) => covers.remove(book.coverPath),
      });
      return {
        repos,
        covers,
        exportImport: new ExportImportService(repos, covers, files),
        metadata: createAppMetadataService(() => repos.settings.get(SETTING_GOOGLE_BOOKS_API_KEY)),
      };
    })();
  }
  return instance;
}
