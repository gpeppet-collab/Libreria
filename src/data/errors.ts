/** Errori di dominio sollevati dai repository. Le schermate li traducono in messaggi. */

export class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entity: string, id: string) {
    super(`${entity} non trovato: ${id}`);
  }
}

export class ValidationError extends RepositoryError {}

export class InvalidIsbnError extends ValidationError {
  constructor(public readonly isbn: string) {
    super(`ISBN non valido: ${isbn}`);
  }
}

export class DuplicateIsbnError extends RepositoryError {
  constructor(
    public readonly isbn: string,
    public readonly existingBookId: string,
  ) {
    super(`Esiste già un libro con ISBN ${isbn}`);
  }
}

export class DuplicateNameError extends RepositoryError {
  constructor(
    entity: string,
    public readonly existingId: string,
  ) {
    super(`${entity} con questo nome esiste già`);
  }
}

export class BuiltinTypeError extends RepositoryError {
  constructor(id: string) {
    super(`Il tipo predefinito "${id}" non può essere eliminato`);
  }
}
