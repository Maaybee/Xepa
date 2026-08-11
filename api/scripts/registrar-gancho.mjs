/**
 * Registra o gancho que põe o PGlite no lugar do pool do Postgres.
 *
 * Entra por `--import`, então roda antes de qualquer módulo de `src/`.
 */

import { register } from 'node:module';

// `config/env.ts` exige DATABASE_URL. Neste modo quem responde é o PGlite,
// mas a variável precisa existir para a checagem passar.
process.env.DATABASE_URL ??= 'pglite://api/.pglite';

register('./gancho-banco.mjs', import.meta.url);
