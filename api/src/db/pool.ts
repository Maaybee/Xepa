import pg from 'pg';
import { env, isProduction } from '../config/env.js';

/**
 * `DECIMAL`/`NUMERIC` chega do driver como string para não perder precisão.
 * Valores monetários e quantidades do Xepa cabem com folga em double, e a
 * camada de Service trabalha com `number` — a conversão é feita aqui, num
 * único ponto.
 */
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

/** `BIGINT` (contagens de agregação) também vem como string. */
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (error) => {
  console.error('[db] erro em cliente ocioso do pool', error);
});

export type QueryParam = unknown;

/** Executa uma query no pool. Usado pelos Repositories. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: QueryParam[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}

/**
 * Executa `fn` dentro de uma transação. Necessário nos fluxos que tocam mais
 * de uma tabela de forma indivisível — por exemplo nota fiscal + itens +
 * movimentações de estoque + transação (SD06).
 */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
