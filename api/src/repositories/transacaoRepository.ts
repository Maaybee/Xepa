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

// ---------------------------------------------------------------------
// Open Finance — importação de extrato (SD26)
// ---------------------------------------------------------------------

/**
 * RN19 — a movimentação já foi importada nesta conta?
 *
 * O índice `idx_transacao_externa_unica` garante no banco; esta consulta é o
 * que permite ignorar em silêncio em vez de estourar violação de unicidade.
 */
export async function buscarPorIdExterno(
  contaId: number,
  idExterno: string,
  db: Executor = pool,
): Promise<{ id: number } | null> {
  const { rows } = await db.query<{ id: number }>(
    `SELECT id FROM transacao WHERE conta_id = $1 AND id_externo = $2`,
    [contaId, idExterno],
  );
  return rows[0] ?? null;
}

/**
 * RN20 — acha a nota fiscal que é o mesmo gasto que esta movimentação.
 *
 * Critério: mesmo usuário, mesmo valor, saída, origem 'nota', ainda não
 * conciliada, e data dentro da janela de tolerância. Ordena pela data mais
 * próxima para que, havendo duas candidatas, a escolhida seja a mais provável.
 *
 * **Não casa por conta**: a transação de nota nasce sem `conta_id`, porque o QR
 * Code da nota não diz qual conta pagou. Exigir conta igual aqui faria a
 * conciliação nunca acontecer e a RN11 contar todo gasto de mercado duas vezes.
 * Por isso a nota candidata é a que ainda não tem conta, ou a que já está na
 * mesma conta da movimentação.
 */
export async function buscarNotaConciliavel(
  usuarioId: number,
  contaId: number,
  valor: number,
  data: string,
  diasDeTolerancia: number,
  db: Executor = pool,
): Promise<{ id: number } | null> {
  const { rows } = await db.query<{ id: number }>(
    `SELECT id
       FROM transacao
      WHERE usuario_id = $1
        AND (conta_id IS NULL OR conta_id = $2)
        AND origem = 'nota'
        AND tipo = 'saida'
        AND conciliada_em IS NULL
        AND id_externo IS NULL
        AND valor = $3
        AND data BETWEEN $4::date - $5::int AND $4::date + $5::int
      ORDER BY abs($4::date - data), id
      LIMIT 1`,
    [usuarioId, contaId, valor, data, diasDeTolerancia],
  );
  return rows[0] ?? null;
}

/**
 * RN20 — carimba a nota como sendo a mesma coisa que a movimentação.
 *
 * Aproveita para gravar a conta: a nota não sabia por onde tinha sido paga, e o
 * extrato sabe. Depois de conciliar, o saldo da conta (RN10) passa a refletir
 * também as compras que entraram por QR Code.
 */
export async function conciliarComExtrato(
  transacaoId: number,
  contaId: number,
  idExterno: string,
  db: Executor = pool,
): Promise<void> {
  await db.query(
    `UPDATE transacao
        SET id_externo = $3, conciliada_em = now(), conta_id = COALESCE(conta_id, $2)
      WHERE id = $1`,
    [transacaoId, contaId, idExterno],
  );
}

/** Insere a movimentação que não casou com nada (origem 'open_finance'). */
export async function inserirDoExtrato(
  usuarioId: number,
  dados: NovaTransacao & { idExterno: string },
  db: Executor = pool,
): Promise<{ id: number }> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO transacao
       (usuario_id, conta_id, categoria_id, tipo, valor, data, origem, descricao, id_externo)
     VALUES ($1, $2, $3, $4, $5, $6, 'open_finance', $7, $8)
     RETURNING id`,
    [
      usuarioId,
      dados.contaId,
      dados.categoriaId,
      dados.tipo,
      dados.valor,
      dados.data,
      dados.descricao,
      dados.idExterno,
    ],
  );
  return rows[0] as { id: number };
}
