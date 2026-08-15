/**
 * Copia os .sql de `src/db/` para `dist/db/` depois do build.
 *
 * O `tsc` só emite o que ele compila, então migrations e seeds ficariam para
 * trás — e o runner os procura ao lado do próprio arquivo (`dist/db/...`).
 * Sem isto, `node dist/db/migrate.js` falha com ENOENT num ambiente já
 * publicado, que é o pior lugar para descobrir.
 */

import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));

for (const pasta of ['migrations', 'seeds']) {
  const origem = join(raiz, 'src', 'db', pasta);
  const destino = join(raiz, 'dist', 'db', pasta);
  await mkdir(destino, { recursive: true });
  await cp(origem, destino, { recursive: true });
  const arquivos = (await readdir(destino)).filter((n) => n.endsWith('.sql'));
  console.log(`[build] ${pasta}: ${arquivos.length} arquivo(s) copiado(s)`);
}
