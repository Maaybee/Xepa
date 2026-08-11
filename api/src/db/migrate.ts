import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, pool } from './pool.js';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Runner de migrations: aplica em ordem alfabética os .sql de `migrations/`
 * que ainda não foram aplicados, cada um dentro da sua própria transação, e
 * registra o nome em `schema_migrations`.
 *
 * `--reset` derruba o schema `public` inteiro antes — só para desenvolvimento.
 */
export async function migrate({ reset = false } = {}): Promise<void> {
  if (reset) {
    console.log('[db] --reset: derrubando o schema public');
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nome        TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const aplicadas = new Set(
    (await pool.query<{ nome: string }>('SELECT nome FROM schema_migrations')).rows.map(
      (row) => row.nome,
    ),
  );

  const arquivos = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  let contador = 0;
  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue;

    const sql = await readFile(join(migrationsDir, arquivo), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [arquivo]);
      await client.query('COMMIT');
      console.log(`[db] aplicada: ${arquivo}`);
      contador += 1;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Falha na migration ${arquivo}: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      client.release();
    }
  }

  console.log(
    contador === 0 ? '[db] nenhuma migration pendente' : `[db] ${contador} migration(s) aplicada(s)`,
  );
}

const executadoDiretamente = process.argv[1] === fileURLToPath(import.meta.url);

if (executadoDiretamente) {
  migrate({ reset: process.argv.includes('--reset') })
    .then(() => closePool())
    .catch(async (error) => {
      console.error(error);
      await closePool();
      process.exit(1);
    });
}
