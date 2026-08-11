import { pool, type Executor } from '../db/pool.js';
import type {
  Avaliacao,
  Materia,
  MetodoMedia,
  OrigemAvaliacao,
  SessaoEstudo,
} from '../models/cabeca.js';

/**
 * Acesso a dados do Módulo 4. Avaliações e sessões pertencem à matéria, e a
 * matéria ao usuário — por isso toda consulta passa pelo `usuario_id`, mesmo
 * quando o filtro natural seria só o `materia_id`.
 */

export async function listarPorUsuario(
  usuarioId: number,
  db: Executor = pool,
): Promise<Materia[]> {
  const { rows } = await db.query<Materia>(
    `SELECT * FROM materia WHERE usuario_id = $1 ORDER BY nome`,
    [usuarioId],
  );
  return rows;
}

export async function buscarPorId(
  usuarioId: number,
  materiaId: number,
  db: Executor = pool,
): Promise<Materia | null> {
  const { rows } = await db.query<Materia>(
    `SELECT * FROM materia WHERE id = $1 AND usuario_id = $2`,
    [materiaId, usuarioId],
  );
  return rows[0] ?? null;
}

export async function buscarPorNome(
  usuarioId: number,
  nome: string,
  db: Executor = pool,
): Promise<Materia | null> {
  const { rows } = await db.query<Materia>(
    `SELECT * FROM materia
      WHERE usuario_id = $1 AND lower(btrim(nome)) = lower(btrim($2))
      LIMIT 1`,
    [usuarioId, nome],
  );
  return rows[0] ?? null;
}

export async function inserir(
  usuarioId: number,
  nome: string,
  metodoMedia: MetodoMedia,
  db: Executor = pool,
): Promise<Materia> {
  const { rows } = await db.query<Materia>(
    `INSERT INTO materia (usuario_id, nome, metodo_media) VALUES ($1, $2, $3) RETURNING *`,
    [usuarioId, nome, metodoMedia],
  );
  return rows[0] as Materia;
}

export async function atualizar(
  usuarioId: number,
  materiaId: number,
  dados: { nome?: string | undefined; metodoMedia?: MetodoMedia | undefined },
  db: Executor = pool,
): Promise<Materia | null> {
  const atribuicoes: string[] = [];
  const valores: unknown[] = [];

  if (dados.nome !== undefined) {
    valores.push(dados.nome);
    atribuicoes.push(`nome = $${valores.length}`);
  }
  if (dados.metodoMedia !== undefined) {
    valores.push(dados.metodoMedia);
    atribuicoes.push(`metodo_media = $${valores.length}`);
  }
  if (atribuicoes.length === 0) return buscarPorId(usuarioId, materiaId, db);

  valores.push(materiaId, usuarioId);
  const { rows } = await db.query<Materia>(
    `UPDATE materia SET ${atribuicoes.join(', ')}
      WHERE id = $${valores.length - 1} AND usuario_id = $${valores.length}
      RETURNING *`,
    valores,
  );
  return rows[0] ?? null;
}

// ----- Avaliações -----

export interface NovaAvaliacao {
  descricao: string;
  valor: number;
  peso: number;
  data: string;
  origem: OrigemAvaliacao;
}

export async function inserirAvaliacao(
  materiaId: number,
  dados: NovaAvaliacao,
  db: Executor = pool,
): Promise<Avaliacao> {
  const { rows } = await db.query<Avaliacao>(
    `INSERT INTO avaliacao (materia_id, descricao, valor, peso, data, origem)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, materia_id, descricao, valor, peso, data::text AS data, origem`,
    [materiaId, dados.descricao, dados.valor, dados.peso, dados.data, dados.origem],
  );
  return rows[0] as Avaliacao;
}

/** Em ordem cronológica: é assim que a progressão (RN16) precisa dos dados. */
export async function listarAvaliacoes(
  materiaId: number,
  db: Executor = pool,
): Promise<Avaliacao[]> {
  const { rows } = await db.query<Avaliacao>(
    `SELECT id, materia_id, descricao, valor, peso, data::text AS data, origem
       FROM avaliacao WHERE materia_id = $1
      ORDER BY data ASC, id ASC`,
    [materiaId],
  );
  return rows;
}

/**
 * Usada pela importação (SD17) para não recriar uma nota que a instituição já
 * mandou antes: mesma matéria, mesma descrição e mesma data.
 */
export async function existeAvaliacaoImportada(
  materiaId: number,
  descricao: string,
  data: string,
  db: Executor = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `SELECT 1 FROM avaliacao
      WHERE materia_id = $1 AND lower(btrim(descricao)) = lower(btrim($2))
        AND data = $3 AND origem = 'importada'`,
    [materiaId, descricao, data],
  );
  return (rowCount ?? 0) > 0;
}

export async function removerAvaliacao(
  usuarioId: number,
  avaliacaoId: number,
  db: Executor = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM avaliacao a
      USING materia m
      WHERE a.id = $1 AND a.materia_id = m.id AND m.usuario_id = $2`,
    [avaliacaoId, usuarioId],
  );
  return rowCount === 1;
}

// ----- Sessões de estudo -----

export async function inserirSessao(
  materiaId: number,
  data: string,
  duracaoMin: number,
  db: Executor = pool,
): Promise<SessaoEstudo> {
  const { rows } = await db.query<SessaoEstudo>(
    `INSERT INTO sessao_estudo (materia_id, data, duracao_min)
     VALUES ($1, $2, $3)
     RETURNING id, materia_id, data::text AS data, duracao_min`,
    [materiaId, data, duracaoMin],
  );
  return rows[0] as SessaoEstudo;
}

export async function listarSessoes(
  materiaId: number,
  db: Executor = pool,
): Promise<SessaoEstudo[]> {
  const { rows } = await db.query<SessaoEstudo>(
    `SELECT id, materia_id, data::text AS data, duracao_min
       FROM sessao_estudo WHERE materia_id = $1
      ORDER BY data DESC, id DESC`,
    [materiaId],
  );
  return rows;
}

/** Sessões de todas as matérias do usuário, para o panorama geral (RF028). */
export async function listarSessoesDoUsuario(
  usuarioId: number,
  db: Executor = pool,
): Promise<Array<SessaoEstudo & { materia_nome: string }>> {
  const { rows } = await db.query<SessaoEstudo & { materia_nome: string }>(
    `SELECT s.id, s.materia_id, s.data::text AS data, s.duracao_min, m.nome AS materia_nome
       FROM sessao_estudo s
       JOIN materia m ON m.id = s.materia_id
      WHERE m.usuario_id = $1
      ORDER BY s.data DESC, s.id DESC`,
    [usuarioId],
  );
  return rows;
}

/** Totais por matéria em uma consulta, para não repetir query por linha. */
export async function resumoPorMateria(
  usuarioId: number,
  db: Executor = pool,
): Promise<Map<number, { totalAvaliacoes: number; totalMinutos: number }>> {
  const { rows } = await db.query<{
    materia_id: number;
    total_avaliacoes: number;
    total_minutos: number;
  }>(
    `SELECT m.id AS materia_id,
            (SELECT count(*) FROM avaliacao a WHERE a.materia_id = m.id)          AS total_avaliacoes,
            (SELECT COALESCE(SUM(s.duracao_min), 0) FROM sessao_estudo s
              WHERE s.materia_id = m.id)                                          AS total_minutos
       FROM materia m
      WHERE m.usuario_id = $1`,
    [usuarioId],
  );

  const mapa = new Map<number, { totalAvaliacoes: number; totalMinutos: number }>();
  for (const linha of rows) {
    mapa.set(linha.materia_id, {
      totalAvaliacoes: Number(linha.total_avaliacoes),
      totalMinutos: Number(linha.total_minutos),
    });
  }
  return mapa;
}

/** Avaliações de todas as matérias do usuário, agrupadas por matéria. */
export async function avaliacoesPorMateria(
  usuarioId: number,
  db: Executor = pool,
): Promise<Map<number, Avaliacao[]>> {
  const { rows } = await db.query<Avaliacao>(
    `SELECT a.id, a.materia_id, a.descricao, a.valor, a.peso,
            a.data::text AS data, a.origem
       FROM avaliacao a
       JOIN materia m ON m.id = a.materia_id
      WHERE m.usuario_id = $1
      ORDER BY a.data ASC, a.id ASC`,
    [usuarioId],
  );

  const mapa = new Map<number, Avaliacao[]>();
  for (const avaliacao of rows) {
    const lista = mapa.get(avaliacao.materia_id) ?? [];
    lista.push(avaliacao);
    mapa.set(avaliacao.materia_id, lista);
  }
  return mapa;
}
