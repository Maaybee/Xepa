import { pool, type Executor } from '../db/pool.js';
import type { ItemNota, NotaFiscal } from '../models/despensa.js';

/** Acesso a dados de nota fiscal (SD06). */

export async function buscarPorChave(
  chaveAcesso: string,
  db: Executor = pool,
): Promise<NotaFiscal | null> {
  const { rows } = await db.query<NotaFiscal>(
    `SELECT id, usuario_id, chave_acesso, local_compra,
            data_compra::text AS data_compra, valor_total, processada
       FROM nota_fiscal WHERE chave_acesso = $1`,
    [chaveAcesso],
  );
  return rows[0] ?? null;
}

export async function listarPorUsuario(
  usuarioId: number,
  db: Executor = pool,
): Promise<NotaFiscal[]> {
  const { rows } = await db.query<NotaFiscal>(
    `SELECT id, usuario_id, chave_acesso, local_compra,
            data_compra::text AS data_compra, valor_total, processada
       FROM nota_fiscal WHERE usuario_id = $1
      ORDER BY data_compra DESC, id DESC`,
    [usuarioId],
  );
  return rows;
}

export interface NovaNota {
  chaveAcesso: string;
  localCompra: string | null;
  dataCompra: string;
  valorTotal: number;
}

export async function salvarNota(
  usuarioId: number,
  dados: NovaNota,
  db: Executor = pool,
): Promise<NotaFiscal> {
  const { rows } = await db.query<NotaFiscal>(
    `INSERT INTO nota_fiscal (usuario_id, chave_acesso, local_compra, data_compra, valor_total)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, usuario_id, chave_acesso, local_compra,
               data_compra::text AS data_compra, valor_total, processada`,
    [usuarioId, dados.chaveAcesso, dados.localCompra, dados.dataCompra, dados.valorTotal],
  );
  return rows[0] as NotaFiscal;
}

export interface NovoItemNota {
  produtoId: number | null;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export async function salvarItem(
  notaFiscalId: number,
  item: NovoItemNota,
  db: Executor = pool,
): Promise<ItemNota> {
  const { rows } = await db.query<ItemNota>(
    `INSERT INTO item_nota (nota_fiscal_id, produto_id, descricao, quantidade, valor_unitario)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [notaFiscalId, item.produtoId, item.descricao, item.quantidade, item.valorUnitario],
  );
  return rows[0] as ItemNota;
}

export async function marcarProcessada(
  notaFiscalId: number,
  db: Executor = pool,
): Promise<void> {
  await db.query(`UPDATE nota_fiscal SET processada = TRUE WHERE id = $1`, [notaFiscalId]);
}

/**
 * RN18 — a nota vira exatamente uma transação, de origem "nota" e categoria
 * "Mercado". O UNIQUE em `nota_fiscal_id` garante a relação 1:1 e, com ela,
 * que o gasto do mês (RN11) não conte a mesma compra duas vezes.
 */
export async function gerarTransacao(
  params: {
    usuarioId: number;
    notaFiscalId: number;
    categoriaId: number;
    valor: number;
    data: string;
    descricao: string;
  },
  db: Executor = pool,
): Promise<{ id: number }> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO transacao
       (usuario_id, categoria_id, nota_fiscal_id, tipo, valor, data, origem, descricao)
     VALUES ($1, $2, $3, 'saida', $4, $5, 'nota', $6)
     RETURNING id`,
    [
      params.usuarioId,
      params.categoriaId,
      params.notaFiscalId,
      params.valor,
      params.data,
      params.descricao,
    ],
  );
  return rows[0] as { id: number };
}
