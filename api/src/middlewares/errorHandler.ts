import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { isProduction } from '../config/env.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    erro: { codigo: 'NOT_FOUND', mensagem: `Rota não encontrada: ${req.method} ${req.path}` },
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      erro: {
        codigo: 'BAD_REQUEST',
        mensagem: 'Dados inválidos.',
        detalhes: err.issues.map((issue) => ({
          campo: issue.path.join('.'),
          mensagem: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      erro: {
        codigo: err.code,
        mensagem: err.message,
        ...(err.details !== undefined ? { detalhes: err.details } : {}),
      },
    });
    return;
  }

  console.error('[api] erro não tratado', err);
  res.status(500).json({
    erro: {
      codigo: 'INTERNAL_ERROR',
      mensagem: 'Erro interno do servidor.',
      ...(isProduction ? {} : { detalhes: err instanceof Error ? err.message : String(err) }),
    },
  });
};
