/**
 * Banco de testes.
 *
 * A API fala com o Postgres por um único módulo (`src/db/pool.ts`); aqui ele é
 * trocado por um PGlite — o próprio Postgres compilado para WASM, rodando em
 * memória. É Postgres de verdade: o DDL de `migrations/` roda inteiro, então as
 * constraints que materializam as RNs (RN01, RN06, RN07, RN08, RN17…) valem
 * dentro dos testes como valem em produção, sem precisar de um servidor.
 *
 * Precisa ser importado antes de qualquer módulo de `src/` — é o que garante
 * que Repositories e Services peguem o pool trocado.
 */

// O env é lido na carga de `src/config/env.ts`; preencher antes evita que a
// checagem de variáveis obrigatórias derrube a suíte.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://xepa:xepa@localhost:5432/xepa_test';
process.env.SMTP_HOST ??= '';

import { readFile } from 'node:fs/promises';
import { mock } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const raizSrc = new URL('../../src/', import.meta.url);

/** Mesmas conversões que `src/db/pool.ts` instala no driver `pg`. */
const parsers = {
  1700: (valor: string) => Number(valor), // NUMERIC
  20: (valor: string) => Number(valor), // INT8
};

interface ResultadoPGlite {
  rows: unknown[];
  affectedRows?: number | undefined;
  fields?: unknown;
}

/**
 * O PGlite devolve `affectedRows`; o `pg` devolve `rowCount`, que é o que os
 * Repositories leem. Em SELECT/RETURNING vale o número de linhas; em
 * UPDATE/DELETE sem RETURNING, o de linhas afetadas.
 */
function adaptar(resultado: ResultadoPGlite) {
  return {
    rows: resultado.rows,
    rowCount: resultado.rows.length || resultado.affectedRows || 0,
    fields: resultado.fields ?? [],
  };
}

export interface BancoDeTeste {
  /** Consulta direta, para montar cenário e conferir o que ficou gravado. */
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
  /** Zera os dados dos usuários, preservando avatares e instituições. */
  limpar(): Promise<void>;
  encerrar(): Promise<void>;
}

let instancia: Promise<BancoDeTeste> | null = null;

/**
 * Sobe o banco e instala o mock do pool. Idempotente: o primeiro teste do
 * arquivo paga a inicialização, os demais reaproveitam.
 */
export function prepararBanco(): Promise<BancoDeTeste> {
  instancia ??= iniciar();
  return instancia;
}

async function iniciar(): Promise<BancoDeTeste> {
  const db = new PGlite({ parsers });

  await db.exec(await ler('db/migrations/001_schema_inicial.sql'));
  await db.exec(await ler('db/seeds/001_dados_de_apoio.sql'));

  const query = async (sql: string, params: unknown[] = []) =>
    adaptar((await db.query(sql, params)) as ResultadoPGlite);

  mock.module(new URL('db/pool.ts', raizSrc).href, {
    namedExports: {
      pool: { query, connect: naoUsado, end: () => db.close() },
      query,
      // O PGlite reverte a transação sozinho quando o callback rejeita, e
      // repropaga o erro — mesmo contrato do `withTransaction` real.
      withTransaction: <T>(fn: (cliente: { query: typeof query }) => Promise<T>) =>
        db.transaction(async (tx) => {
          const clienteQuery = async (sql: string, params: unknown[] = []) =>
            adaptar((await tx.query(sql, params)) as ResultadoPGlite);
          return fn({ query: clienteQuery as typeof query });
        }) as Promise<T>,
      closePool: () => db.close(),
    },
  });

  return {
    query: query as BancoDeTeste['query'],
    limpar: async () => {
      // Tudo que é do usuário cai em cascata a partir de `usuario`; avatar e
      // instituicao são dados de apoio compartilhados e ficam.
      await db.exec('TRUNCATE usuario RESTART IDENTITY CASCADE');
    },
    encerrar: () => db.close(),
  };
}

async function ler(caminho: string): Promise<string> {
  return readFile(new URL(caminho, raizSrc), 'utf8');
}

function naoUsado(): never {
  throw new Error('pool.connect() não é usado pela API fora do runner de migrations.');
}
