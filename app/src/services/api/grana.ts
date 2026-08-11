/** Módulo 3 — Grana (SD11–SD15). */

import type {
  Categoria,
  Conta,
  Orcamento,
  ResultadoLancamento,
  Resumo,
  TipoTransacao,
  Transacao,
} from '@/types/api';
import { comFiltros, requisitar } from './cliente';

export function listarContas() {
  return requisitar<{ contas: Conta[] }>('/grana/contas');
}

export function cadastrarConta(nomeBanco: string, saldoInicial: number) {
  return requisitar<{ conta: Conta }>('/grana/contas', {
    metodo: 'POST',
    corpo: { nomeBanco, saldoInicial },
  });
}

export function listarCategorias() {
  return requisitar<{ categorias: Categoria[] }>('/grana/categorias');
}

/** SD13 — registro manual (RF017), o caminho principal no iOS (RNF13). */
export function registrarLancamento(dados: {
  tipo: TipoTransacao;
  valor: number;
  data: string;
  categoriaId?: number | null;
  contaId?: number | null;
  descricao?: string | null;
}) {
  return requisitar<ResultadoLancamento>('/grana/transacoes', { metodo: 'POST', corpo: dados });
}

export function listarTransacoes(filtros: { mes?: string; tipo?: TipoTransacao; limite?: number } = {}) {
  return requisitar<{ transacoes: Transacao[] }>(comFiltros('/grana/transacoes', filtros));
}

/** SD14 — "a sacola": o resumo do mês. */
export function obterResumo(mes?: string) {
  return requisitar<Resumo>(comFiltros('/grana/resumo', { mes }));
}

export function listarOrcamentos(mes?: string) {
  return requisitar<{ mesReferencia: string; orcamentos: Orcamento[] }>(
    comFiltros('/grana/orcamentos', { mes }),
  );
}

/** SD15 — RN17: redefinir o mês atualiza o orçamento, não cria outro. */
export function definirOrcamento(categoriaId: number, mesReferencia: string, valorLimite: number) {
  return requisitar<{ orcamento: Orcamento }>('/grana/orcamentos', {
    metodo: 'POST',
    corpo: { categoriaId, mesReferencia, valorLimite },
  });
}

export function removerOrcamento(orcamentoId: number) {
  return requisitar<void>(`/grana/orcamentos/${orcamentoId}`, { metodo: 'DELETE' });
}
