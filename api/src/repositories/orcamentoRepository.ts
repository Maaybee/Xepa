import { pool, type Executor } from '../db/pool.js';
import type { Orcamento } from '../models/grana.js';

/** Acesso a dados de ORCAMENTO (SD13, SD15). */

export async function buscarPorCategoriaMes(
  usuarioId: number,
  categoriaId: number,
  mesReferencia: string,
  db: Executor = pool,
): Promise<Orcamento | null> {
  const { rows } = await db.query<Orcamento>(
    `SELECT * FROM orcamento
      WHERE usuario_id = $1 AND categoria_id = $2 AND mes_referencia = $3`,
    [usuarioId, categoriaId, mesReferencia],
  );
  return rows[0] ?? null;
}

/**
 * RN17 — no máximo um orçamento por usuário + categoria + mês. Em vez de
 * "busca, depois insere ou atualiza", o upsert resolve tudo em uma ida ao
 * banco e não abre janela para duas requisições simultâneas criarem duplicata:
 * a própria constraint UNIQUE arbitra.
 */
export async function salvar(
  usuarioId: number,
  categoriaId: number,
  mesReferencia: string,
  valorLimite: number,
  db: Executor = pool,
): Promise<{ orcamento: Orcamento; criado: boolean }> {
  const { rows } = await db.query<Orcamento & { criado: boolean }>(
    `INSERT INTO orcamento (usuario_id, categoria_id, mes_referencia, valor_limite)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario_id, categoria_id, mes_referencia)
       DO UPDATE SET valor_limite = EXCLUDED.valor_limite
     RETURNING *, (xmax = 0) AS criado`,
    [usuarioId, categoriaId, mesReferencia, valorLimite],
  );
  const linha = rows[0] as Orcamento & { criado: boolean };
  return { orcamento: linha, criado: linha.criado };
}

export async function listarPorMes(
  usuarioId: number,
  mesReferencia: string,
  db: Executor = pool,
): Promise<Array<Orcamento & { categoria_nome: string }>> {
  const { rows } = await db.query<Orcamento & { categoria_nome: string }>(
    `SELECT o.*, cat.nome AS categoria_nome
       FROM orcamento o
       JOIN categoria cat ON cat.id = o.categoria_id
      WHERE o.usuario_id = $1 AND o.mes_referencia = $2
      ORDER BY cat.nome`,
    [usuarioId, mesReferencia],
  );
  return rows;
}

export async function remover(
  usuarioId: number,
  orcamentoId: number,
  db: Executor = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM orcamento WHERE id = $1 AND usuario_id = $2`,
    [orcamentoId, usuarioId],
  );
  return rowCount === 1;
}
