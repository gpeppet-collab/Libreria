import { ExpoFilePort } from './ExpoFilePort';
import type { FilePort } from './FilePort';

/** Android: file system reale. Sul web Metro usa `createFilePort.web.ts`. */
export function createFilePort(): FilePort {
  return new ExpoFilePort();
}
