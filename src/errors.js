export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(id) {
  return new AppError(404, 'RECIPE_NOT_FOUND', `Tarif bulunamadı: ${id}`);
}
