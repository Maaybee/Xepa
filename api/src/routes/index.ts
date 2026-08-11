import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { contaRoutes } from './contaRoutes.js';

export const routes = Router();

routes.get(
  '/saude',
  asyncHandler(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', banco: 'ok' });
  }),
);

routes.use('/conta', contaRoutes);

// Despensa, Grana, Cabeça e Roupa são montados aqui conforme forem
// implementados.
