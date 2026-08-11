import { pool, type Executor } from '../db/pool.js';
import type { ContaBancaria, ContaView } from '../models/grana.js';
import { arredondar } from '../models/grana.js';

/** Acesso a dados de conta bancária (SD11, SD14). */

export async function inserir(
  usuarioId: number,
  nomeBanco: string,
  saldoInicial: number,
  db: Executor = pool,
): Promise<ContaBancaria> {
  const { rows } = await db.query<ContaBancaria>(
    `INSERT INTO conta_bancaria (usuario_id, nome_banco, saldo_inicial)
     VALUES ($1, $2, $3) RETURNING *`,
    [usuarioId, nomeBanco, saldoInicial],
  );
  return rows[0] as ContaBancaria;
}

export async function buscarPorId(
  usuarioId: number,
  contaId: number,
  db: Executor = pool,
): Promise<ContaBancaria | null> {
  const { rows } = await db.query<ContaBancaria>(
    `SELECT * FROM conta_bancaria WHERE id = $1 AND usuario_id = $2`,
    [contaId, usuarioId],
  );
  return rows[0] ?? null;
}

export async function buscarPorNome(
  usuarioId: number,
  nomeBanco: string,
  db: Executor = pool,
): Promise<ContaBancaria | null> {
  const { rows } = await db.query<ContaBancaria>(
    `SELECT * FROM conta_bancaria
      WHERE usuario_id = $1 AND lower(btrim(nome_banco)) = lower(btrim($2))
      LIMIT 1`,
    [usuarioId, nomeBanco],
  );
  return rows[0] ?? null;
}

/**
 * RF019 / RN10 — contas com o saldo calculado: saldo_inicial somado às
 * entradas e subtraído das saídas daquela conta.
 *
 * A agregação sai do banco em uma consulta só; somar em memória exigiria
 * trazer toda a movimentação da conta.
 */
export async function listarComSaldo(
  usuarioId: number,
  db: Executor = pool,
): Promise<ContaView[]> {
  const { rows } = await db.query<{
    id: number;
    nome_banco: string;
    saldo_inicial: number;
    entradas: number;
    saidas: number;
  }>(
    `SELECT c.id,
            c.nome_banco,
            c.saldo_inicial,
            COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'entrada'), 0) AS entradas,
            COALESCE(SUM(t.valor) FILTER (WHERE t.tipo = 'saida'),   0) AS saidas
       FROM conta_bancaria c
       LEFT JOIN transacao t ON t.conta_id = c.id
      WHERE c.usuario_id = $1
      GROUP BY c.id, c.nome_banco, c.saldo_inicial
      ORDER BY c.nome_banco`,
    [usuarioId],
  );

  return rows.map((linha) => ({
    id: linha.id,
    nomeBanco: linha.nome_banco,
    saldoInicial: linha.saldo_inicial,
    entradas: arredondar(linha.entradas),
    saidas: arredondar(linha.saidas),
    saldo: arredondar(linha.saldo_inicial + linha.entradas - linha.saidas),
  }));
}
