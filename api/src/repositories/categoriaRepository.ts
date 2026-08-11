import { pool, type Executor } from '../db/pool.js';

/**
 * Categorias financeiras (entidade CATEGORIA). Não confundir com
 * `PRODUTO.categoria`, que é texto livre da despensa.
 */

export interface Categoria {
  id: number;
  usuario_id: number;
  nome: string;
}

/** RN18 — nome da categoria em que toda transação vinda de nota fiscal cai. */
export const CATEGORIA_MERCADO = 'Mercado';

export async function buscarPorNome(
  usuarioId: number,
  nome: string,
  db: Executor = pool,
): Promise<Categoria | null> {
  const { rows } = await db.query<Categoria>(
    `SELECT * FROM categoria WHERE usuario_id = $1 AND nome = $2`,
    [usuarioId, nome],
  );
  return rows[0] ?? null;
}

/**
 * Devolve a categoria, criando-a se faltar. O cadastro já semeia as padrão,
 * mas a nota fiscal não pode falhar caso o usuário tenha apagado "Mercado".
 */
export async function garantir(
  usuarioId: number,
  nome: string,
  db: Executor = pool,
): Promise<Categoria> {
  const { rows } = await db.query<Categoria>(
    `INSERT INTO categoria (usuario_id, nome) VALUES ($1, $2)
     ON CONFLICT (usuario_id, nome) DO UPDATE SET nome = EXCLUDED.nome
     RETURNING *`,
    [usuarioId, nome],
  );
  return rows[0] as Categoria;
}

export async function buscarPorId(
  usuarioId: number,
  categoriaId: number,
  db: Executor = pool,
): Promise<Categoria | null> {
  const { rows } = await db.query<Categoria>(
    `SELECT * FROM categoria WHERE id = $1 AND usuario_id = $2`,
    [categoriaId, usuarioId],
  );
  return rows[0] ?? null;
}

export async function inserir(
  usuarioId: number,
  nome: string,
  db: Executor = pool,
): Promise<Categoria> {
  const { rows } = await db.query<Categoria>(
    `INSERT INTO categoria (usuario_id, nome) VALUES ($1, $2) RETURNING *`,
    [usuarioId, nome],
  );
  return rows[0] as Categoria;
}

export async function listarPorUsuario(
  usuarioId: number,
  db: Executor = pool,
): Promise<Categoria[]> {
  const { rows } = await db.query<Categoria>(
    `SELECT * FROM categoria WHERE usuario_id = $1 ORDER BY nome`,
    [usuarioId],
  );
  return rows;
}
