/**
 * Generazione di id (uuid v4).
 * Usa `crypto.randomUUID` quando disponibile (Node, web), altrimenti `expo-crypto`.
 * Il require è lazy per non caricare moduli nativi nei test in puro Node.
 */
export function newId(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const expoCrypto = require('expo-crypto') as { randomUUID: () => string };
  return expoCrypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
