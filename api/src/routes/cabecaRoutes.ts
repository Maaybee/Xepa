import { Router } from 'express';
import * as cabecaController from '../controllers/cabecaController.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { autenticar } from '../middlewares/autenticar.js';

/** Módulo 4 — Cabeça (UC14–UC17). Tudo exige sessão. */
export const cabecaRoutes = Router();

cabecaRoutes.use(autenticar);

cabecaRoutes.get('/materias', asyncHandler(cabecaController.listarMaterias));
cabecaRoutes.post('/materias', asyncHandler(cabecaController.cadastrarMateria));
cabecaRoutes.put('/materias/:id', asyncHandler(cabecaController.editarMateria));

cabecaRoutes.get('/materias/:id/avaliacoes', asyncHandler(cabecaController.listarAvaliacoes));
cabecaRoutes.post('/materias/:id/avaliacoes', asyncHandler(cabecaController.registrarAvaliacao));
cabecaRoutes.delete('/avaliacoes/:id', asyncHandler(cabecaController.removerAvaliacao));

cabecaRoutes.get('/materias/:id/sessoes', asyncHandler(cabecaController.listarSessoes));
cabecaRoutes.post('/materias/:id/sessoes', asyncHandler(cabecaController.registrarSessao));

cabecaRoutes.get('/materias/:id/desempenho', asyncHandler(cabecaController.obterDesempenho));
cabecaRoutes.get('/desempenho', asyncHandler(cabecaController.obterPanorama));

cabecaRoutes.post('/importar', asyncHandler(cabecaController.importarNotas));
