import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, withTransaction } from './pool.js';

const seedsDir = join(dirname(fileURLToPath(import.meta.url)), 'seeds');

/**
 * Executa todos os .sql de `seeds/` em ordem. Diferente das migrations, os
 * seeds não são registrados: são idempotentes e podem rodar de novo.
 */
export async function seed(): Promise<void> {
  const arquivos = (await readdir(seedsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const arquivo of arquivos) {
    const sql = await readFile(join(seedsDir, arquivo), 'utf8');
    await withTransaction((client) => client.query(sql));
    console.log(`[db] seed: ${arquivo}`);
  }

  console.log(`[db] ${arquivos.length} seed(s) aplicado(s)`);
}

const executadoDiretamente = process.argv[1] === fileURLToPath(import.meta.url);

if (executadoDiretamente) {
  seed()
    .then(() => closePool())
    .catch(async (error) => {
      console.error(error);
      await closePool();
      process.exit(1);
    });
}
