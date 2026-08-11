/**
 * Erro de domínio. A camada de Service lança; o Controller (via
 * errorHandler) traduz em resposta HTTP. Os Services não conhecem Express.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details);

export const unauthorized = (message = 'Não autorizado.') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Acesso negado.') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Recurso não encontrado.') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (message: string) =>
  new AppError(409, 'CONFLICT', message);

export const unprocessable = (message: string, details?: unknown) =>
  new AppError(422, 'UNPROCESSABLE_ENTITY', message, details);
