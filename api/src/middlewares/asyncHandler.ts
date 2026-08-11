import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * O Express 4 não encaminha rejeições de Promise para o error handler.
 * Todo handler assíncrono de Controller é embrulhado aqui.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
