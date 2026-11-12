import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createTestDatabase, type NodeSqliteDatabase } from '@/data/__tests__/nodeSqlite';
import { createRepositories } from '@/data/repositories';
import { ServicesProvider } from '@/hooks/ServicesContext';
import type { AppServices } from '@/services/appServices';
import { MemoryFilePort } from '@/services/__tests__/MemoryFilePort';
import { CoverService } from '@/services/covers/CoverService';
import { ExportImportService } from '@/services/exportImport/ExportImportService';
import type { BookMetadata, MetadataService } from '@/services/metadata/MetadataProvider';

export interface TestContext {
  db: NodeSqliteDatabase;
  services: AppServices;
  files: MemoryFilePort;
  /** Risposte del servizio metadati per ISBN. */
  metadata: Map<string, BookMetadata | null>;
}

/** Servizi reali su SQLite in memoria e file system in memoria; metadati simulati. */
export async function createTestServices(): Promise<TestContext> {
  const db = await createTestDatabase();
  const files = new MemoryFilePort();
  const covers = new CoverService(files);
  const repos = createRepositories(db, { onBookRemoved: (b) => covers.remove(b.coverPath) });
  const metadata = new Map<string, BookMetadata | null>();
  const metadataService: MetadataService = { lookup: async (isbn) => metadata.get(isbn) ?? null };
  return {
    db,
    files,
    metadata,
    services: {
      repos,
      covers,
      exportImport: new ExportImportService(repos, covers, files),
      metadata: metadataService,
    },
  };
}

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export async function renderWithServices(ui: ReactElement, services: AppServices) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>
        <ServicesProvider services={services}>{ui}</ServicesProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}
