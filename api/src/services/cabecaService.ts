import { withTransaction } from '../db/pool.js';
import type {
  AvaliacaoView,
  DesempenhoMateria,
  EstatisticasEstudo,
  Materia,
  MateriaView,
  MetodoMedia,
  SessaoView,
} from '../models/cabeca.js';
import {
  calcularEstatisticas,
  calcularMedia,
  calcularProgressao,
} from '../models/cabeca.js';
import * as materiaRepository from '../repositories/materiaRepository.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { conflict, notFound, unprocessable } from '../utils/errors.js';
import * as instituicaoService from './instituicaoService.js';

/**
 * Módulo 4 — Cabeça (acompanhamento de estudos).
 * Implementa SD16 a SD20.
 */

// ---------------------------------------------------------------------
// SD16 — Matérias (RF022, RN15)
// ---------------------------------------------------------------------

export async function cadastrarMateria(
  usuarioId: number,
  nome: string,
  metodoMedia: MetodoMedia,
): Promise<MateriaView> {
  const existente = await materiaRepository.buscarPorNome(usuarioId, nome);
  if (existente) {
    throw conflict(`Você já cadastrou "${existente.nome}".`);
  }

  const materia = await materiaRepository.inserir(usuarioId, nome.trim(), metodoMedia);
  return {
    id: materia.id,
    nome: materia.nome,
    metodoMedia: materia.metodo_media,
    media: null,
    totalAvaliacoes: 0,
    totalMinutosEstudo: 0,
  };
}

export async function editarMateria(
  usuarioId: number,
  materiaId: number,
  dados: { nome?: string | undefined; metodoMedia?: MetodoMedia | undefined },
): Promise<MateriaView> {
  await exigirMateria(usuarioId, materiaId);

  if (dados.nome !== undefined) {
    const homonima = await materiaRepository.buscarPorNome(usuarioId, dados.nome);
    if (homonima && homonima.id !== materiaId) {
      throw conflict(`Você já cadastrou "${homonima.nome}".`);
    }
  }

  const atualizada = await materiaRepository.atualizar(usuarioId, materiaId, dados);
  if (!atualizada) throw notFound('Matéria não encontrada.');

  // Trocar o método muda a média (RN15), então ela é recalculada na resposta.
  const avaliacoes = await materiaRepository.listarAvaliacoes(materiaId);
  const sessoes = await materiaRepository.listarSessoes(materiaId);

  return {
    id: atualizada.id,
    nome: atualizada.nome,
    metodoMedia: atualizada.metodo_media,
    media: calcularMedia(avaliacoes, atualizada.metodo_media),
    totalAvaliacoes: avaliacoes.length,
    totalMinutosEstudo: sessoes.reduce((total, s) => total + s.duracao_min, 0),
  };
}

/** RF026 — cada matéria já vem com a média calculada pelo seu método (RN15). */
export async function listarMaterias(usuarioId: number): Promise<MateriaView[]> {
  const materias = await materiaRepository.listarPorUsuario(usuarioId);
  const avaliacoesPorMateria = await materiaRepository.avaliacoesPorMateria(usuarioId);
  const resumo = await materiaRepository.resumoPorMateria(usuarioId);

  return materias.map((materia) => {
    const avaliacoes = avaliacoesPorMateria.get(materia.id) ?? [];
    const totais = resumo.get(materia.id);
    return {
      id: materia.id,
      nome: materia.nome,
      metodoMedia: materia.metodo_media,
      media: calcularMedia(avaliacoes, materia.metodo_media),
      totalAvaliacoes: totais?.totalAvaliacoes ?? avaliacoes.length,
      totalMinutosEstudo: totais?.totalMinutos ?? 0,
    };
  });
}

async function exigirMateria(usuarioId: number, materiaId: number): Promise<Materia> {
  const materia = await materiaRepository.buscarPorId(usuarioId, materiaId);
  // Matéria de outro usuário se comporta como inexistente.
  if (!materia) throw notFound('Matéria não encontrada.');
  return materia;
}

// ---------------------------------------------------------------------
// SD18 — Registrar nota manualmente (RF024)
// ---------------------------------------------------------------------

export interface DadosAvaliacao {
  descricao: string;
  valor: number;
  peso?: number | undefined;
  data: string;
}

export async function registrarAvaliacao(
  usuarioId: number,
  materiaId: number,
  dados: DadosAvaliacao,
): Promise<AvaliacaoView> {
  await exigirMateria(usuarioId, materiaId);

  const avaliacao = await materiaRepository.inserirAvaliacao(materiaId, {
    descricao: dados.descricao.trim(),
    valor: dados.valor,
    // Peso só pesa na média ponderada (RN15); na simples fica registrado e é ignorado.
    peso: dados.peso ?? 1,
    data: dados.data,
    origem: 'manual',
  });

  return toAvaliacaoView(avaliacao);
}

export async function listarAvaliacoes(
  usuarioId: number,
  materiaId: number,
): Promise<AvaliacaoView[]> {
  await exigirMateria(usuarioId, materiaId);
  const avaliacoes = await materiaRepository.listarAvaliacoes(materiaId);
  return avaliacoes.map(toAvaliacaoView);
}

export async function removerAvaliacao(usuarioId: number, avaliacaoId: number): Promise<void> {
  const removida = await materiaRepository.removerAvaliacao(usuarioId, avaliacaoId);
  if (!removida) throw notFound('Avaliação não encontrada.');
}

function toAvaliacaoView(avaliacao: {
  id: number;
  descricao: string;
  valor: number;
  peso: number;
  data: string;
  origem: 'manual' | 'importada';
}): AvaliacaoView {
  return {
    id: avaliacao.id,
    descricao: avaliacao.descricao,
    valor: avaliacao.valor,
    peso: avaliacao.peso,
    data: avaliacao.data,
    origem: avaliacao.origem,
  };
}

// ---------------------------------------------------------------------
// SD19 — Registrar sessão de estudo (RF025)
// ---------------------------------------------------------------------

export async function registrarSessao(
  usuarioId: number,
  materiaId: number,
  data: string,
  duracaoMin: number,
): Promise<SessaoView> {
  await exigirMateria(usuarioId, materiaId);
  const sessao = await materiaRepository.inserirSessao(materiaId, data, duracaoMin);
  return { id: sessao.id, data: sessao.data, duracaoMin: sessao.duracao_min };
}

export async function listarSessoes(
  usuarioId: number,
  materiaId: number,
): Promise<SessaoView[]> {
  await exigirMateria(usuarioId, materiaId);
  const sessoes = await materiaRepository.listarSessoes(materiaId);
  return sessoes.map((s) => ({ id: s.id, data: s.data, duracaoMin: s.duracao_min }));
}

// ---------------------------------------------------------------------
// SD20 — Consultar desempenho (RF026, RF027, RF028, RN15, RN16)
// ---------------------------------------------------------------------

export async function obterDesempenho(
  usuarioId: number,
  materiaId: number,
): Promise<DesempenhoMateria> {
  const materia = await exigirMateria(usuarioId, materiaId);
  const avaliacoes = await materiaRepository.listarAvaliacoes(materiaId);
  const sessoes = await materiaRepository.listarSessoes(materiaId);

  return {
    materia: { id: materia.id, nome: materia.nome, metodoMedia: materia.metodo_media },
    media: calcularMedia(avaliacoes, materia.metodo_media),
    avaliacoes: avaliacoes.map(toAvaliacaoView),
    progressao: calcularProgressao(avaliacoes, materia.metodo_media),
    estudo: calcularEstatisticas(sessoes),
  };
}

/** RF028 — panorama de tempo de estudo somando todas as matérias. */
export async function obterPanorama(usuarioId: number): Promise<{
  materias: MateriaView[];
  /** RF026 — média das médias, considerando só matérias que já têm nota. */
  mediaGeral: number | null;
  estudo: EstatisticasEstudo;
  estudoPorMateria: Array<{ materia: string; minutos: number; sessoes: number }>;
}> {
  const materias = await listarMaterias(usuarioId);
  const sessoes = await materiaRepository.listarSessoesDoUsuario(usuarioId);

  const comMedia = materias.filter((m) => m.media !== null);
  const mediaGeral =
    comMedia.length > 0
      ? Math.round((comMedia.reduce((t, m) => t + (m.media ?? 0), 0) / comMedia.length) * 100) / 100
      : null;

  const porMateria = new Map<string, { minutos: number; sessoes: number }>();
  for (const sessao of sessoes) {
    const atual = porMateria.get(sessao.materia_nome) ?? { minutos: 0, sessoes: 0 };
    porMateria.set(sessao.materia_nome, {
      minutos: atual.minutos + sessao.duracao_min,
      sessoes: atual.sessoes + 1,
    });
  }

  return {
    materias,
    mediaGeral,
    estudo: calcularEstatisticas(sessoes),
    estudoPorMateria: [...porMateria.entries()]
      .map(([materia, dados]) => ({ materia, ...dados }))
      .sort((a, b) => b.minutos - a.minutos),
  };
}

// ---------------------------------------------------------------------
// SD17 — Importar notas da instituição (RF023, RN05)
// ---------------------------------------------------------------------

export interface ResultadoImportacao {
  instituicao: string;
  importadas: number;
  ignoradas: number;
  materiasCriadas: string[];
  avaliacoes: Array<{ materia: string; descricao: string; valor: number; data: string }>;
}

export async function importarNotas(usuarioId: number): Promise<ResultadoImportacao> {
  const usuario = await usuarioRepository.buscarPorId(usuarioId);
  if (!usuario) throw notFound('Usuário não encontrado.');

  // RN05 — a importação só acontece com vínculo institucional ativo
  if (usuario.instituicao_id === null) {
    throw unprocessable(
      'Vincule uma instituição de ensino ao seu perfil para importar notas.',
    );
  }

  const nomeInstituicao = usuario.instituicao_nome ?? 'Sua instituição';
  // Lança 503 quando a instituição não expõe integração — o caso comum.
  const notas = await instituicaoService.buscarNotas(nomeInstituicao, usuarioId);

  const materiasCriadas: string[] = [];
  const avaliacoes: ResultadoImportacao['avaliacoes'] = [];
  let ignoradas = 0;

  // Tudo numa transação: uma importação parcial deixaria o histórico
  // acadêmico pela metade, sem como saber o que entrou.
  await withTransaction(async (client) => {
    for (const nota of notas) {
      let materia = await materiaRepository.buscarPorNome(usuarioId, nota.materia, client);
      if (!materia) {
        materia = await materiaRepository.inserir(usuarioId, nota.materia.trim(), 'simples', client);
        materiasCriadas.push(materia.nome);
      }

      // Reimportar não duplica: mesma matéria, descrição e data já importada.
      const jaImportada = await materiaRepository.existeAvaliacaoImportada(
        materia.id,
        nota.descricao,
        nota.data,
        client,
      );
      if (jaImportada) {
        ignoradas += 1;
        continue;
      }

      await materiaRepository.inserirAvaliacao(
        materia.id,
        {
          descricao: nota.descricao,
          valor: nota.valor,
          peso: nota.peso,
          data: nota.data,
          origem: 'importada',
        },
        client,
      );

      avaliacoes.push({
        materia: materia.nome,
        descricao: nota.descricao,
        valor: nota.valor,
        data: nota.data,
      });
    }
  });

  return {
    instituicao: nomeInstituicao,
    importadas: avaliacoes.length,
    ignoradas,
    materiasCriadas,
    avaliacoes,
  };
}
