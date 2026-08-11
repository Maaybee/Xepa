import type { Request } from 'express';
import * as contaService from '../services/contaService.js';
import { unauthorized } from '../utils/errors.js';
import { asyncHandler } from './asyncHandler.js';

/** Lê o token do cabeçalho `Authorization: Bearer <token>`. */
export function extrairToken(req: Request): string {
  const header = req.header('authorization') ?? '';
  const [esquema, token] = header.split(' ');
  if (esquema?.toLowerCase() !== 'bearer' || !token) {
    throw unauthorized('Informe o token da sessão em Authorization: Bearer <token>.');
  }
  return token;
}

/**
 * Protege as rotas que exigem sessão. Além de validar o token, renova a
 * janela de inatividade de 30 minutos (RNF09) — o trabalho é do Service.
 */
export const autenticar = asyncHandler(async (req, _res, next) => {
  req.usuario = await contaService.resolverSessao(extrairToken(req));
  next();
});

/** O usuário autenticado da requisição. Só use depois do `autenticar`. */
export function usuarioAutenticado(req: Request) {
  if (!req.usuario) {
    throw unauthorized('Sessão inválida ou expirada.');
  }
  return req.usuario;
}
