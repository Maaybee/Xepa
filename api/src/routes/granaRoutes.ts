import { Router } from 'express';
import * as granaController from '../controllers/granaController.js';
import * as openFinanceController from '../controllers/openFinanceController.js';
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

// Open Finance (SD25–SD27). Mora sob /grana porque é automação financeira.
granaRoutes.get('/open-finance/instituicoes', asyncHandler(openFinanceController.listarInstituicoes));
granaRoutes.get('/open-finance/conexoes', asyncHandler(openFinanceController.listarConexoes));
granaRoutes.post('/open-finance/consentimentos', asyncHandler(openFinanceController.criarConsentimento));
granaRoutes.post(
  '/open-finance/consentimentos/:id/autorizar',
  asyncHandler(openFinanceController.autorizarConsentimento),
);
granaRoutes.post(
  '/open-finance/consentimentos/:id/sincronizar',
  asyncHandler(openFinanceController.sincronizar),
);
granaRoutes.delete(
  '/open-finance/consentimentos/:id',
  asyncHandler(openFinanceController.revogarConsentimento),
);
// Existe só enquanto o provedor for o simulado — ver o controller.
granaRoutes.post(
  '/open-finance/consentimentos/:id/simular-autorizacao',
  asyncHandler(openFinanceController.simularAutorizacao),
);
