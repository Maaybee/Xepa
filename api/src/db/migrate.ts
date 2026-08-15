import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, pool } from './pool.js';
import { env } from '../config/env.js';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Runner de migrations: aplica em ordem alfabética os .sql de `migrations/`
 * que ainda não foram aplicados, cada um dentro da sua própria transação, e
 * registra o nome em `schema_migrations`.
 *
 * `--reset` derruba o schema `public` inteiro antes — só para desenvolvimento.
 */
/**
 * Bancos onde `--reset` é seguro: os que rodam na própria máquina.
 *
 * `DROP SCHEMA public CASCADE` não apaga só as tabelas do Xepa. Num Postgres
 * gerenciado ele leva junto o que o provedor mantém no schema — no Supabase,
 * os grants de `anon`, `authenticated` e `service_role`, que não voltam com o
 * `CREATE SCHEMA` seguinte e deixam o projeto quebrado.
 *
 * Um banco remoto costuma ser o de outra pessoa também, então o reset exige
 * dizer o nome do host de novo, em `DB_RESET_CONFIRMA_HOST`. É chato de
 * propósito: o comando está a um `npm run db:reset` de distância.
 */
function exigirResetSeguro(): void {
  const host = new URL(env.databaseUrl).hostname;
  const local = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host);
  if (local || process.env.DB_RESET_CONFIRMA_HOST === host) return;

  throw new Error(
    `Recusando --reset em um banco remoto (${host}).\n\n` +
      'DROP SCHEMA public CASCADE apaga mais do que as tabelas do Xepa: em ' +
      'Postgres gerenciado ele derruba também os grants do provedor. No ' +
      'Supabase isso quebra o projeto.\n\n' +
      `Se for mesmo isso que você quer:\n  DB_RESET_CONFIRMA_HOST=${host} npm run db:reset`,
  );
}

export async function migrate({ reset = false } = {}): Promise<void> {
  if (reset) {
    exigirResetSeguro();
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
