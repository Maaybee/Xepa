import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

export const routes = Router();

routes.get(
  '/saude',
  asyncHandler(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', banco: 'ok' });
  }),
);

// Os módulos (Conta, Despensa, Grana, Cabeça, Roupa) são montados aqui
// conforme forem implementados.
