/** Entidades do Módulo 3 — Grana (financeiro). */

export type TipoTransacao = 'entrada' | 'saida';
export type OrigemTransacao = 'automatica' | 'manual' | 'nota' | 'open_finance';

export interface ContaBancaria {
  id: number;
  usuario_id: number;
  nome_banco: string;
  saldo_inicial: number;
  criado_em: Date;
}

export interface Transacao {
  id: number;
  usuario_id: number;
  conta_id: number | null;
  categoria_id: number | null;
  nota_fiscal_id: number | null;
  tipo: TipoTransacao;
  valor: number;
  data: string;
  origem: OrigemTransacao;
  descricao: string | null;
}

export interface Orcamento {
  id: number;
  usuario_id: number;
  categoria_id: number;
  mes_referencia: string;
  valor_limite: number;
}

/** RN12 — o alerta de orçamento dispara ao atingir 80% do limite. */
export const LIMIAR_ALERTA_ORCAMENTO = 0.8;

/** Conta com o saldo já calculado pela RN10. */
export interface ContaView {
  id: number;
  nomeBanco: string;
  saldoInicial: number;
  entradas: number;
  saidas: number;
  /** RN10 — saldo_inicial + entradas - saídas. */
  saldo: number;
}

export interface TransacaoView {
  id: number;
  tipo: TipoTransacao;
  valor: number;
  data: string;
  origem: OrigemTransacao;
  descricao: string | null;
  categoria: { id: number; nome: string } | null;
  conta: { id: number; nomeBanco: string } | null;
  notaFiscalId: number | null;
}

export interface TransacaoComRelacionamentos extends Transacao {
  categoria_nome: string | null;
  conta_nome_banco: string | null;
}

export function toTransacaoView(linha: TransacaoComRelacionamentos): TransacaoView {
  return {
    id: linha.id,
    tipo: linha.tipo,
    valor: linha.valor,
    data: linha.data,
    origem: linha.origem,
    descricao: linha.descricao,
    categoria:
      linha.categoria_id !== null
        ? { id: linha.categoria_id, nome: linha.categoria_nome ?? '' }
        : null,
    conta:
      linha.conta_id !== null
        ? { id: linha.conta_id, nomeBanco: linha.conta_nome_banco ?? '' }
        : null,
    notaFiscalId: linha.nota_fiscal_id,
  };
}

/** RF021 — situação de um orçamento diante do que já foi gasto. */
export interface OrcamentoView {
  id: number;
  categoria: { id: number; nome: string };
  mesReferencia: string;
  valorLimite: number;
  gasto: number;
  restante: number;
  /** Percentual do limite já consumido, de 0 a 100 (pode passar de 100). */
  percentual: number;
  /** RN12 — verdadeiro a partir de 80% do limite. */
  emAlerta: boolean;
  estourado: boolean;
}

export function montarOrcamentoView(dados: {
  id: number;
  categoriaId: number;
  categoriaNome: string;
  mesReferencia: string;
  valorLimite: number;
  gasto: number;
}): OrcamentoView {
  const percentual = dados.valorLimite > 0 ? (dados.gasto / dados.valorLimite) * 100 : 0;
  return {
    id: dados.id,
    categoria: { id: dados.categoriaId, nome: dados.categoriaNome },
    mesReferencia: dados.mesReferencia,
    valorLimite: dados.valorLimite,
    gasto: arredondar(dados.gasto),
    restante: arredondar(dados.valorLimite - dados.gasto),
    percentual: Math.round(percentual * 10) / 10,
    emAlerta: dados.gasto >= dados.valorLimite * LIMIAR_ALERTA_ORCAMENTO,
    estourado: dados.gasto > dados.valorLimite,
  };
}

/** SD14 — resumo de gastos e saldos (RF018, RF019). */
export interface ResumoFinanceiro {
  periodo: { de: string; ate: string };
  entradas: number;
  /** RN11 — soma das despesas do período, só a partir de TRANSACAO. */
  saidas: number;
  resultado: number;
  gastosPorCategoria: Array<{
    categoria: { id: number; nome: string } | null;
    total: number;
    percentual: number;
  }>;
  contas: ContaView[];
  saldoTotal: number;
}

export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
