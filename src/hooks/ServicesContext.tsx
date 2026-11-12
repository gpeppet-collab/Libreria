import { createContext, useContext, type PropsWithChildren } from 'react';

import type { AppServices } from '@/services/appServices';

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: PropsWithChildren<{ services: AppServices }>) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

/** Servizi dell'app (repository, copertine, export/import, metadati). */
export function useServices(): AppServices {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices va usato dentro ServicesProvider');
  return ctx;
}
