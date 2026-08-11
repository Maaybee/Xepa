import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { contaRoutes } from './contaRoutes.js';
import { despensaRoutes } from './despensaRoutes.js';
import { granaRoutes } from './granaRoutes.js';

export const routes = Router();

routes.get(
  '/saude',
  asyncHandler(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', banco: 'ok' });
  }),
);

routes.use('/conta', contaRoutes);
routes.use('/despensa', despensaRoutes);
routes.use('/grana', granaRoutes);

// Cabeça e Roupa são montados aqui conforme forem implementados.
