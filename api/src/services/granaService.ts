import type {
  ContaView,
  OrcamentoView,
  ResumoFinanceiro,
  TipoTransacao,
  TransacaoView,
} from '../models/grana.js';
import {
  LIMIAR_ALERTA_ORCAMENTO,
  arredondar,
  montarOrcamentoView,
  toTransacaoView,
} from '../models/grana.js';
import * as categoriaRepository from '../repositories/categoriaRepository.js';
import * as contaRepository from '../repositories/contaRepository.js';
import * as orcamentoRepository from '../repositories/orcamentoRepository.js';
import * as transacaoRepository from '../repositories/transacaoRepository.js';
import { badRequest, conflict, notFound, unprocessable } from '../utils/errors.js';

/**
 * Módulo 3 — Grana (financeiro).
 * Implementa SD11 a SD15.
 */

// ---------------------------------------------------------------------
// SD11 — Contas bancárias (RF014) e RF019/RN10
// ---------------------------------------------------------------------

export async function cadastrarConta(
  usuarioId: number,
  nomeBanco: string,
  saldoInicial: number,
): Promise<ContaView> {
  const existente = await contaRepository.buscarPorNome(usuarioId, nomeBanco);
  if (existente) {
    throw conflict(`Você já tem uma conta chamada "${existente.nome_banco}".`);
  }

  const conta = await contaRepository.inserir(usuarioId, nomeBanco.trim(), saldoInicial);
  return {
    id: conta.id,
    nomeBanco: conta.nome_banco,
    saldoInicial: conta.saldo_inicial,
    entradas: 0,
    saidas: 0,
    saldo: conta.saldo_inicial,
  };
}

/** RF019 / RN10 — saldo categorizado por conta. */
export async function listarContas(usuarioId: number): Promise<ContaView[]> {
  return contaRepository.listarComSaldo(usuarioId);
}

// ---------------------------------------------------------------------
// Categorias financeiras
// ---------------------------------------------------------------------

export async function listarCategorias(usuarioId: number) {
  const categorias = await categoriaRepository.listarPorUsuario(usuarioId);
  return categorias.map((categoria) => ({ id: categoria.id, nome: categoria.nome }));
}

export async function criarCategoria(usuarioId: number, nome: string) {
  const existente = await categoriaRepository.buscarPorNome(usuarioId, nome.trim());
  if (existente) {
    throw conflict(`Você já tem a categoria "${existente.nome}".`);
  }
  const categoria = await categoriaRepository.inserir(usuarioId, nome.trim());
  return { id: categoria.id, nome: categoria.nome };
}

// ---------------------------------------------------------------------
// SD13 — Registro manual + alerta de orçamento (RF017, RN11, RN12)
// ---------------------------------------------------------------------

export interface AlertaOrcamento {
  categoria: string;
  mesReferencia: string;
  valorLimite: number;
  gasto: number;
  percentual: number;
  estourado: boolean;
  mensagem: string;
}

export interface ResultadoLancamento {
  transacao: TransacaoView;
  /** RN12 — presente quando o gasto da categoria atingiu 80% do orçamento. */
  alertaOrcamento: AlertaOrcamento | null;
  /** RN10 — saldo da conta depois do lançamento, quando há conta envolvida. */
  saldoConta: ContaView | null;
}

export interface DadosLancamento {
  tipo: TipoTransacao;
  valor: number;
  data: string;
  categoriaId?: number | null | undefined;
  contaId?: number | null | undefined;
  descricao?: string | null | undefined;
}

export async function registrarLancamentoManual(
  usuarioId: number,
  dados: DadosLancamento,
): Promise<ResultadoLancamento> {
  const categoriaId = await validarCategoria(usuarioId, dados.categoriaId);
  const contaId = await validarConta(usuarioId, dados.contaId);

  const transacao = await transacaoRepository.inserir(usuarioId, {
    contaId,
    categoriaId,
    tipo: dados.tipo,
    valor: arredondar(dados.valor),
    data: dados.data,
    origem: 'manual',
    descricao: dados.descricao ?? null,
  });

  return montarResultado(usuarioId, transacao, categoriaId, contaId);
}

// ---------------------------------------------------------------------
// SD12 — Registro automático via notificação bancária (RF015, RN09, RN10)
// ---------------------------------------------------------------------

/**
 * O app recebe a notificação do banco e repassa aqui.
 *
 * RNF13: no iOS a leitura de notificações é restrita, então na prática este
 * caminho só é alimentado no Android — no iOS o financeiro se apoia no
 * registro manual (RF017).
 */
export async function registrarLancamentoAutomatico(
  usuarioId: number,
  dados: DadosLancamento,
): Promise<ResultadoLancamento> {
  // RN09 — todo lançamento automático fica vinculado a uma conta cadastrada
  if (dados.contaId === undefined || dados.contaId === null) {
    throw unprocessable(
      'Lançamento automático precisa de uma conta bancária cadastrada (RN09).',
    );
  }

  const conta = await contaRepository.buscarPorId(usuarioId, dados.contaId);
  if (!conta) {
    throw unprocessable(
      'Lançamento automático precisa de uma conta bancária cadastrada (RN09).',
    );
  }

  const categoriaId = await validarCategoria(usuarioId, dados.categoriaId);

  const transacao = await transacaoRepository.inserir(usuarioId, {
    contaId: conta.id,
    categoriaId,
    tipo: dados.tipo,
    valor: arredondar(dados.valor),
    data: dados.data,
    origem: 'automatica',
    descricao: dados.descricao ?? null,
  });

  return montarResultado(usuarioId, transacao, categoriaId, conta.id);
}

async function montarResultado(
  usuarioId: number,
  transacao: Awaited<ReturnType<typeof transacaoRepository.inserir>>,
  categoriaId: number | null,
  contaId: number | null,
): Promise<ResultadoLancamento> {
  const view = toTransacaoView(transacao);

  const alertaOrcamento =
    view.tipo === 'saida' && categoriaId !== null
      ? await avaliarOrcamento(usuarioId, categoriaId, view.data)
      : null;

  const saldoConta =
    contaId !== null
      ? (await contaRepository.listarComSaldo(usuarioId)).find((c) => c.id === contaId) ?? null
      : null;

  return { transacao: view, alertaOrcamento, saldoConta };
}

/**
 * RN12 — compara o gasto acumulado da categoria no mês com o limite e devolve
 * o alerta a partir de 80%.
 */
async function avaliarOrcamento(
  usuarioId: number,
  categoriaId: number,
  data: string,
): Promise<AlertaOrcamento | null> {
  const mesReferencia = mesDe(data);
  const orcamento = await orcamentoRepository.buscarPorCategoriaMes(
    usuarioId,
    categoriaId,
    mesReferencia,
  );
  if (!orcamento) return null;

  const gasto = await transacaoRepository.somarGastosCategoriaMes(
    usuarioId,
    categoriaId,
    mesReferencia,
  );
  if (gasto < orcamento.valor_limite * LIMIAR_ALERTA_ORCAMENTO) return null;

  const categoria = await categoriaRepository.buscarPorId(usuarioId, categoriaId);
  const nome = categoria?.nome ?? 'categoria';
  const percentual = Math.round((gasto / orcamento.valor_limite) * 1000) / 10;
  const estourado = gasto > orcamento.valor_limite;

  return {
    categoria: nome,
    mesReferencia,
    valorLimite: orcamento.valor_limite,
    gasto: arredondar(gasto),
    percentual,
    estourado,
    mensagem: estourado
      ? `Você estourou o orçamento de ${nome} em ${mesReferencia}: ` +
        `R$ ${arredondar(gasto).toFixed(2)} de R$ ${orcamento.valor_limite.toFixed(2)}.`
      : `Você já usou ${percentual}% do orçamento de ${nome} em ${mesReferencia}: ` +
        `R$ ${arredondar(gasto).toFixed(2)} de R$ ${orcamento.valor_limite.toFixed(2)}.`,
  };
}

async function validarCategoria(
  usuarioId: number,
  categoriaId: number | null | undefined,
): Promise<number | null> {
  if (categoriaId === undefined || categoriaId === null) return null;
  const categoria = await categoriaRepository.buscarPorId(usuarioId, categoriaId);
  if (!categoria) throw badRequest('Categoria inválida.');
  return categoria.id;
}

async function validarConta(
  usuarioId: number,
  contaId: number | null | undefined,
): Promise<number | null> {
  if (contaId === undefined || contaId === null) return null;
  const conta = await contaRepository.buscarPorId(usuarioId, contaId);
  if (!conta) throw badRequest('Conta bancária inválida.');
  return conta.id;
}

// ---------------------------------------------------------------------
// SD14 — Consultar gastos e saldo (RF018, RF019, RN10, RN11)
// ---------------------------------------------------------------------

export interface FiltroPeriodo {
  mes?: string | undefined;
  de?: string | undefined;
  ate?: string | undefined;
}

export async function obterResumo(
  usuarioId: number,
  filtro: FiltroPeriodo,
): Promise<ResumoFinanceiro> {
  const { de, ate } = resolverPeriodo(filtro);

  const totais = await transacaoRepository.totaisDoPeriodo(usuarioId, de, ate);
  const gastos = await transacaoRepository.gastosPorCategoria(usuarioId, de, ate);
  const contas = await contaRepository.listarComSaldo(usuarioId);

  const saidas = arredondar(totais.saidas);

  return {
    periodo: { de, ate },
    entradas: arredondar(totais.entradas),
    saidas,
    resultado: arredondar(totais.entradas - totais.saidas),
    gastosPorCategoria: gastos.map((linha) => ({
      categoria:
        linha.categoriaId !== null
          ? { id: linha.categoriaId, nome: linha.categoriaNome ?? '' }
          : null,
      total: arredondar(linha.total),
      percentual: saidas > 0 ? Math.round((linha.total / saidas) * 1000) / 10 : 0,
    })),
    contas,
    saldoTotal: arredondar(contas.reduce((total, conta) => total + conta.saldo, 0)),
  };
}

export async function listarTransacoes(
  usuarioId: number,
  filtro: FiltroPeriodo & {
    categoriaId?: number | undefined;
    contaId?: number | undefined;
    tipo?: TipoTransacao | undefined;
    limite?: number | undefined;
  },
): Promise<TransacaoView[]> {
  // Sem período informado, lista as mais recentes sem recortar por data.
  const periodo =
    filtro.mes || filtro.de || filtro.ate ? resolverPeriodo(filtro) : { de: undefined, ate: undefined };

  const transacoes = await transacaoRepository.listar(usuarioId, {
    de: periodo.de,
    ate: periodo.ate,
    categoriaId: filtro.categoriaId,
    contaId: filtro.contaId,
    tipo: filtro.tipo,
    limite: filtro.limite,
  });
  return transacoes.map(toTransacaoView);
}

// ---------------------------------------------------------------------
// SD15 — Orçamento por categoria (RF020, RF021, RN17)
// ---------------------------------------------------------------------

export async function definirOrcamento(
  usuarioId: number,
  categoriaId: number,
  mesReferencia: string,
  valorLimite: number,
): Promise<{ orcamento: OrcamentoView; criado: boolean }> {
  const categoria = await categoriaRepository.buscarPorId(usuarioId, categoriaId);
  if (!categoria) throw badRequest('Categoria inválida.');

  // RN17 — o upsert garante um único orçamento por categoria e mês
  const { orcamento, criado } = await orcamentoRepository.salvar(
    usuarioId,
    categoriaId,
    mesReferencia,
    arredondar(valorLimite),
  );

  const gasto = await transacaoRepository.somarGastosCategoriaMes(
    usuarioId,
    categoriaId,
    mesReferencia,
  );

  return {
    orcamento: montarOrcamentoView({
      id: orcamento.id,
      categoriaId,
      categoriaNome: categoria.nome,
      mesReferencia,
      valorLimite: orcamento.valor_limite,
      gasto,
    }),
    criado,
  };
}

/** RF021 — orçamentos do mês com o quanto já foi consumido de cada um. */
export async function listarOrcamentos(
  usuarioId: number,
  mesReferencia: string,
): Promise<OrcamentoView[]> {
  const orcamentos = await orcamentoRepository.listarPorMes(usuarioId, mesReferencia);
  const gastos = await transacaoRepository.somarGastosPorCategoriaNoMes(usuarioId, mesReferencia);

  return orcamentos.map((orcamento) =>
    montarOrcamentoView({
      id: orcamento.id,
      categoriaId: orcamento.categoria_id,
      categoriaNome: orcamento.categoria_nome,
      mesReferencia: orcamento.mes_referencia,
      valorLimite: orcamento.valor_limite,
      gasto: gastos.get(orcamento.categoria_id) ?? 0,
    }),
  );
}

export async function removerOrcamento(usuarioId: number, orcamentoId: number): Promise<void> {
  const removido = await orcamentoRepository.remover(usuarioId, orcamentoId);
  if (!removido) throw notFound('Orçamento não encontrado.');
}

// ---------------------------------------------------------------------
// Período
// ---------------------------------------------------------------------

/** "2026-08-14" -> "2026-08" */
export function mesDe(data: string): string {
  return data.slice(0, 7);
}

/**
 * Aceita `mes=AAAA-MM` (atalho para o mês inteiro) ou `de`/`ate`. Sem nada,
 * usa o mês corrente — é a "sacola" do mês, a visão padrão do produto.
 */
function resolverPeriodo(filtro: FiltroPeriodo): { de: string; ate: string } {
  if (filtro.de || filtro.ate) {
    const de = filtro.de ?? '0001-01-01';
    const ate = filtro.ate ?? '9999-12-31';
    if (de > ate) throw badRequest('A data inicial não pode ser depois da final.');
    return { de, ate };
  }

  const mes = filtro.mes ?? new Date().toISOString().slice(0, 7);
  return { de: `${mes}-01`, ate: ultimoDiaDoMes(mes) };
}

function ultimoDiaDoMes(mes: string): string {
  const [ano, mesNumero] = mes.split('-').map(Number) as [number, number];
  // Dia 0 do mês seguinte é o último dia deste mês.
  const ultimo = new Date(Date.UTC(ano, mesNumero, 0)).getUTCDate();
  return `${mes}-${String(ultimo).padStart(2, '0')}`;
}
