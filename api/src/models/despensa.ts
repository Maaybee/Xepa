/** Entidades do Módulo 2 — Despensa, como estão no banco. */

export interface Produto {
  id: number;
  usuario_id: number;
  nome: string;
  /** Texto livre. Não confundir com a entidade CATEGORIA (financeira). */
  categoria: string | null;
  unidade: string;
  quantidade_atual: number;
  monitorado: boolean;
  quantidade_minima: number | null;
  criado_em: Date;
}

export interface MovimentacaoEstoque {
  id: number;
  produto_id: number;
  tipo: 'entrada' | 'baixa';
  quantidade: number;
  data: Date;
}

export interface NotaFiscal {
  id: number;
  usuario_id: number;
  chave_acesso: string;
  local_compra: string | null;
  data_compra: string;
  valor_total: number;
  processada: boolean;
}

export interface ItemNota {
  id: number;
  nota_fiscal_id: number;
  produto_id: number | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

/** Item do estoque como o cliente vê. */
export interface ProdutoView {
  id: number;
  nome: string;
  categoria: string | null;
  unidade: string;
  quantidadeAtual: number;
  monitorado: boolean;
  quantidadeMinima: number | null;
  /** RN08 — verdadeiro quando um item monitorado atingiu ou passou da mínima. */
  emAlerta: boolean;
  criadoEm: Date;
}

export function toProdutoView(produto: Produto): ProdutoView {
  return {
    id: produto.id,
    nome: produto.nome,
    categoria: produto.categoria,
    unidade: produto.unidade,
    quantidadeAtual: produto.quantidade_atual,
    monitorado: produto.monitorado,
    quantidadeMinima: produto.quantidade_minima,
    emAlerta: estaEmAlerta(produto),
    criadoEm: produto.criado_em,
  };
}

/**
 * RN08 — o alerta dispara quando a quantidade de um item monitorado atinge ou
 * fica abaixo da mínima definida pelo usuário para aquele item.
 */
export function estaEmAlerta(produto: {
  monitorado: boolean;
  quantidade_atual: number;
  quantidade_minima: number | null;
}): boolean {
  if (!produto.monitorado || produto.quantidade_minima === null) return false;
  return produto.quantidade_atual <= produto.quantidade_minima;
}

/** RF013 — histórico de valor pago e local de compra por item. */
export interface CompraHistorico {
  data: string;
  localCompra: string | null;
  descricaoNota: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface MovimentacaoView {
  tipo: 'entrada' | 'baixa';
  quantidade: number;
  data: Date;
}

export interface ProdutoDetalhe extends ProdutoView {
  historicoCompras: CompraHistorico[];
  movimentacoes: MovimentacaoView[];
}
