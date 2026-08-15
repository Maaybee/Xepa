import pg from 'pg';
import { env } from '../config/env.js';

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
  max: env.dbPoolMax,
  idleTimeoutMillis: 30_000,
  // `rejectUnauthorized: false` aceita o certificado do provedor sem exigir a
  // CA local — é o que os Postgres gerenciados esperam de um cliente comum.
  ...(env.dbSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (error) => {
  console.error('[db] erro em cliente ocioso do pool', error);
});

export type QueryParam = unknown;

/**
 * Quem executa uma query: o pool (cada chamada em sua própria conexão) ou um
 * cliente de transação. Os Repositories recebem isso como parâmetro opcional,
 * então a mesma função serve para uso solto e dentro de uma transação — é o
 * que permite ao SD06 gravar nota, itens, movimentações e transação de forma
 * indivisível sem duplicar SQL.
 */
export interface Executor {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>>;
}

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
