import type { FilePort } from './FilePort';
import { WebFilePort } from './WebFilePort';

/** Web (anteprima): file in memoria del browser, download e selezione tramite il DOM. */
export function createFilePort(): FilePort {
  return new WebFilePort();
}
