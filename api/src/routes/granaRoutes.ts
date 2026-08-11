import { Router } from 'express';
import * as granaController from '../controllers/granaController.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { autenticar } from '../middlewares/autenticar.js';

/** Módulo 3 — Grana (UC10–UC13). Tudo exige sessão. */
export const granaRoutes = Router();

granaRoutes.use(autenticar);

granaRoutes.get('/contas', asyncHandler(granaController.listarContas));
granaRoutes.post('/contas', asyncHandler(granaController.cadastrarConta));

granaRoutes.get('/categorias', asyncHandler(granaController.listarCategorias));
granaRoutes.post('/categorias', asyncHandler(granaController.criarCategoria));

granaRoutes.get('/transacoes', asyncHandler(granaController.listarTransacoes));
granaRoutes.post('/transacoes', asyncHandler(granaController.registrarLancamento));
granaRoutes.post('/transacoes/auto', asyncHandler(granaController.registrarLancamentoAutomatico));

granaRoutes.get('/resumo', asyncHandler(granaController.obterResumo));

granaRoutes.get('/orcamentos', asyncHandler(granaController.listarOrcamentos));
granaRoutes.post('/orcamentos', asyncHandler(granaController.definirOrcamento));
granaRoutes.delete('/orcamentos/:id', asyncHandler(granaController.removerOrcamento));
