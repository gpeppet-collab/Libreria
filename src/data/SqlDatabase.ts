/**
 * Sottoinsieme dell'API di `expo-sqlite` usato dai repository.
 * Definirlo come interfaccia permette di eseguire gli stessi repository
 * su un altro motore SQLite (nei test: `node:sqlite` in memoria).
 */
export type SqlValue = string | number | null;
export type SqlParams = SqlValue[];

export interface SqlRunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SqlDatabase {
  /** Esegue uno o più statement senza parametri. */
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlParams): Promise<SqlRunResult>;
  getAllAsync<T>(source: string, params: SqlParams): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlParams): Promise<T | null>;
  /** Esegue `task` in una transazione (BEGIN/COMMIT, ROLLBACK su errore). Non annidabile. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
