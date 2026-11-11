/** Utilità SQL condivise dai repository. */

/** Escape per `LIKE ? ESCAPE '\'`. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function likeContains(value: string): string {
  return `%${escapeLike(value)}%`;
}

export function likeStartsWith(value: string): string {
  return `${escapeLike(value)}%`;
}

/** `?, ?, ?` per n parametri. */
export function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(', ');
}

/** `CASE col WHEN v0 THEN 0 WHEN v1 THEN 1 … ELSE n END` per ordinare secondo una lista fissa. */
export function caseOrder(column: string, values: readonly string[]): string {
  const whens = values.map((v, i) => `WHEN '${v.replace(/'/g, "''")}' THEN ${i}`).join(' ');
  return `CASE ${column} ${whens} ELSE ${values.length} END`;
}
