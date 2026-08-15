/**
 * Gancho de resolução de módulos: troca `src/db/pool.ts` por
 * `scripts/banco-em-memoria.ts`.
 *
 * É o que permite subir a API inteira sobre PGlite sem que nada em `src/`
 * saiba disso — Controllers, Services e Repositories continuam importando
 * `../db/pool.js` como sempre.
 *
 * Roda depois do gancho do tsx (registrado antes), então `nextResolve` já
 * devolve o caminho `.ts` resolvido, e o arquivo substituto volta pela
 * cadeia para o tsx transpilar.
 */

const original = new URL('../src/db/pool.ts', import.meta.url).href;
const substituto = new URL('./banco-em-memoria.ts', import.meta.url).href;

export async function resolve(especificador, contexto, nextResolve) {
  const resultado = await nextResolve(especificador, contexto);
  if (resultado.url === original) {
    return { ...resultado, url: substituto, shortCircuit: true };
  }
  return resultado;
}
