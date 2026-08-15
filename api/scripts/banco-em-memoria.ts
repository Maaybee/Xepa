/**
 * Substituto de `src/db/pool.ts` para desenvolvimento sem Postgres instalado.
 *
 * Usa PGlite — o próprio Postgres compilado para WASM — que já é dependência
 * de desenvolvimento por causa da suíte de testes. É o mesmo arranjo de
 * `test/apoio/banco.ts`, com duas diferenças: aqui os dados são gravados em
 * disco (`api/.pglite/`), para a conta que você criou sobreviver a um
 * reinício, e as migrations rodam sozinhas na primeira subida.
 *
 * Não é substituto de Postgres em produção: serve para levantar a API na
 * máquina de quem está desenvolvendo o app. `npm run dev` continua falando
 * com um Postgres de verdade.
 *
 * Este arquivo nunca é importado diretamente — `scripts/gancho-banco.mjs`
 * o coloca no lugar do módulo original em tempo de resolução, e é por isso
 * que ele repete a superfície pública de `db/pool.ts`.
 */

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const diretorioDados = join(raiz, '.pglite');

/** As mesmas conversões que o `pg` recebe em `src/db/pool.ts`. */
const parsers = {
  1700: (valor: string) => Number(valor), // NUMERIC
  20: (valor: string) => Number(valor), // INT8
};

const db = new PGlite(diretorioDados, { parsers });

interface ResultadoPGlite {
  rows: unknown[];
  affectedRows?: number | undefined;
  fields?: unknown;
}

/**
 * O PGlite devolve `affectedRows`; o `pg` devolve `rowCount`, que é o que os
 * Repositories leem.
 */
function adaptar(resultado: ResultadoPGlite) {
  return {
    rows: resultado.rows,
    rowCount: resultado.rows.length || resultado.affectedRows || 0,
    fields: resultado.fields ?? [],
  };
}

export async function query<T = Record<string, unknown>>(
  texto: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  return adaptar((await db.query(texto, params)) as ResultadoPGlite) as {
    rows: T[];
    rowCount: number;
  };
}

/** O PGlite reverte a transação sozinho quando o callback rejeita. */
export async function withTransaction<T>(
  fn: (cliente: { query: typeof query }) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const clienteQuery = async (texto: string, params: unknown[] = []) =>
      adaptar((await tx.query(texto, params)) as ResultadoPGlite);
    return fn({ query: clienteQuery as typeof query });
  }) as Promise<T>;
}

export const pool = {
  query,
  connect: () => {
    throw new Error('pool.connect() não é usado fora do runner de migrations.');
  },
  end: () => db.close(),
};

export async function closePool(): Promise<void> {
  await db.close();
}

export type Executor = { query: typeof query };
export type QueryParam = unknown;

// ---------------------------------------------------------------------
// Preparo do banco
// ---------------------------------------------------------------------

// Top-level await: quem importa este módulo (os Repositories) só recebe o
// controle depois que o schema existe.
await prepararSchema();

async function prepararSchema(): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nome        TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { rows } = await db.query<{ nome: string }>('SELECT nome FROM schema_migrations');
  const aplicadas = new Set(rows.map((linha) => linha.nome));

  // Lê o diretório em ordem, como `src/db/migrate.ts`. Uma lista fixa aqui faz
  // o modo sem Postgres rodar contra um schema mais velho que o do sistema, e
  // a migration nova só aparece quebrada em tempo de execução.
  const arquivos = (await readdir(join(raiz, 'src', 'db', 'migrations')))
    .filter((nome) => nome.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) continue;
    await db.exec(await ler(join('migrations', arquivo)));
    await db.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [arquivo]);
    console.log(`[db:memoria] migration aplicada: ${arquivo}`);
  }

  // Os seeds são idempotentes (INSERT ... WHERE NOT EXISTS).
  await db.exec(await ler(join('seeds', '001_dados_de_apoio.sql')));

  console.log(`[db:memoria] PGlite pronto em ${diretorioDados}`);
}

function ler(caminhoRelativo: string): Promise<string> {
  return readFile(join(raiz, 'src', 'db', caminhoRelativo), 'utf8');
}
