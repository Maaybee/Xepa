import { pool, type Executor } from '../db/pool.js';
import type {
  OrigemTransacao,
  TipoTransacao,
  TransacaoComRelacionamentos,
} from '../models/grana.js';

/**
 * Acesso a dados de TRANSACAO (SD12, SD13, SD14).
 *
 * Toda leitura financeira sai daqui: o gasto do mês (RN11) e o saldo (RN10)
 * se apoiam só nesta tabela, o que evita contar a mesma compra duas vezes
 * quando ela veio de nota fiscal.
 */

const SELECT_COM_RELACIONAMENTOS = `
  SELECT t.id, t.usuario_id, t.conta_id, t.categoria_id, t.nota_fiscal_id,
         t.tipo, t.valor, t.data::text AS data, t.origem, t.descricao,
         cat.nome       AS categoria_nome,
         c.nome_banco   AS conta_nome_banco
    FROM transacao t
    LEFT JOIN categoria cat ON cat.id = t.categoria_id
    LEFT JOIN conta_bancaria c ON c.id = t.conta_id
`;

export interface NovaTransacao {
  contaId: number | null;
  categoriaId: number | null;
  tipo: TipoTransacao;
  valor: number;
  data: string;
  origem: OrigemTransacao;
  descricao: string | null;
}

export async function inserir(
  usuarioId: number,
  dados: NovaTransacao,
  db: Executor = pool,
): Promise<TransacaoComRelacionamentos> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO transacao
       (usuario_id, conta_id, categoria_id, tipo, valor, data, origem, descricao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      usuarioId,
      dados.contaId,
      dados.categoriaId,
      dados.tipo,
      dados.valor,
      dados.data,
      dados.origem,
      dados.descricao,
    ],
  );
  const criada = await buscarPorId(usuarioId, (rows[0] as { id: number }).id, db);
  return criada as TransacaoComRelacionamentos;
}

export async function buscarPorId(
  usuarioId: number,
  transacaoId: number,
  db: Executor = pool,
): Promise<TransacaoComRelacionamentos | null> {
  const { rows } = await db.query<TransacaoComRelacionamentos>(
    `${SELECT_COM_RELACIONAMENTOS} WHERE t.id = $1 AND t.usuario_id = $2`,
    [transacaoId, usuarioId],
  );
  return rows[0] ?? null;
}

export interface FiltroTransacoes {
  de?: string | undefined;
  ate?: string | undefined;
  categoriaId?: number | undefined;
  contaId?: number | undefined;
  tipo?: TipoTransacao | undefined;
  limite?: number | undefined;
}

export async function listar(
  usuarioId: number,
  filtro: FiltroTransacoes = {},
  db: Executor = pool,
): Promise<TransacaoComRelacionamentos[]> {
  const condicoes = ['t.usuario_id = $1'];
  const valores: unknown[] = [usuarioId];

  const adicionar = (sql: string, valor: unknown) => {
    valores.push(valor);
    condicoes.push(sql.replace('?', `$${valores.length}`));
  };

  if (filtro.de) adicionar('t.data >= ?', filtro.de);
  if (filtro.ate) adicionar('t.data <= ?', filtro.ate);
  if (filtro.categoriaId !== undefined) adicionar('t.categoria_id = ?', filtro.categoriaId);
  if (filtro.contaId !== undefined) adicionar('t.conta_id = ?', filtro.contaId);
  if (filtro.tipo) adicionar('t.tipo = ?', filtro.tipo);

  valores.push(filtro.limite ?? 200);

  const { rows } = await db.query<TransacaoComRelacionamentos>(
    `${SELECT_COM_RELACIONAMENTOS}
      WHERE ${condicoes.join(' AND ')}
      ORDER BY t.data DESC, t.id DESC
      LIMIT $${valores.length}`,
    valores,
  );
  return rows;
}

/**
 * RN11 — soma das despesas de uma categoria dentro do mês de referência.
 * É o número que a RN12 compara com o limite do orçamento.
 */
export async function somarGastosCategoriaMes(
  usuarioId: number,
  categoriaId: number,
  mesReferencia: string,
  db: Executor = pool,
): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(valor), 0) AS total
       FROM transacao
      WHERE usuario_id = $1
        AND categoria_id = $2
        AND tipo = 'saida'
        AND to_char(data, 'YYYY-MM') = $3`,
    [usuarioId, categoriaId, mesReferencia],
  );
  return (rows[0] as { total: number }).total;
}

/** Gasto de várias categorias de uma vez, para não repetir consulta por linha. */
export async function somarGastosPorCategoriaNoMes(
  usuarioId: number,
  mesReferencia: string,
  db: Executor = pool,
): Promise<Map<number, number>> {
  const { rows } = await db.query<{ categoria_id: number | null; total: number }>(
    `SELECT categoria_id, COALESCE(SUM(valor), 0) AS total
       FROM transacao
      WHERE usuario_id = $1 AND tipo = 'saida' AND to_char(data, 'YYYY-MM') = $2
      GROUP BY categoria_id`,
    [usuarioId, mesReferencia],
  );
  const mapa = new Map<number, number>();
  for (const linha of rows) {
    if (linha.categoria_id !== null) mapa.set(linha.categoria_id, linha.total);
  }
  return mapa;
}

/** RF018 — gastos agrupados por categoria dentro do período. */
export async function gastosPorCategoria(
  usuarioId: number,
  de: string,
  ate: string,
  db: Executor = pool,
): Promise<Array<{ categoriaId: number | null; categoriaNome: string | null; total: number }>> {
  const { rows } = await db.query<{
    categoria_id: number | null;
    categoria_nome: string | null;
    total: number;
  }>(
    `SELECT t.categoria_id, cat.nome AS categoria_nome, SUM(t.valor) AS total
       FROM transacao t
       LEFT JOIN categoria cat ON cat.id = t.categoria_id
      WHERE t.usuario_id = $1 AND t.tipo = 'saida' AND t.data BETWEEN $2 AND $3
      GROUP BY t.categoria_id, cat.nome
      ORDER BY total DESC`,
    [usuarioId, de, ate],
  );
  return rows.map((linha) => ({
    categoriaId: linha.categoria_id,
    categoriaNome: linha.categoria_nome,
    total: linha.total,
  }));
}

/** Entradas e saídas do período, para o resumo (RN11). */
export async function totaisDoPeriodo(
  usuarioId: number,
  de: string,
  ate: string,
  db: Executor = pool,
): Promise<{ entradas: number; saidas: number }> {
  const { rows } = await db.query<{ entradas: number; saidas: number }>(
    `SELECT COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada'), 0) AS entradas,
            COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'),   0) AS saidas
       FROM transacao
      WHERE usuario_id = $1 AND data BETWEEN $2 AND $3`,
    [usuarioId, de, ate],
  );
  return rows[0] as { entradas: number; saidas: number };
}
