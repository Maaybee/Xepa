/** Módulo 2 — Despensa (SD06–SD10). */

import type { Produto, ResultadoConsumo } from '@/types/api';
import { requisitar } from './cliente';

export function listarEstoque() {
  return requisitar<{ produtos: Produto[] }>('/despensa/produtos');
}

/** RF012 — o que precisa de reposição agora (RN08). */
export function listarAlertas() {
  return requisitar<{ produtos: Produto[] }>('/despensa/alertas');
}

export function criarProduto(dados: {
  nome: string;
  categoria?: string | null;
  unidade?: string;
  quantidadeInicial?: number;
  monitorado?: boolean;
  quantidadeMinima?: number | null;
}) {
  return requisitar<{ produto: Produto }>('/despensa/produtos', { metodo: 'POST', corpo: dados });
}

/** SD08 — baixa de consumo. O backend recusa o que deixaria negativo (RN07). */
export function registrarConsumo(produtoId: number, quantidade: number) {
  return requisitar<ResultadoConsumo>(`/despensa/produtos/${produtoId}/consumo`, {
    metodo: 'POST',
    corpo: { quantidade },
  });
}

/** SD10 — RN08: monitorar exige uma quantidade mínima. */
export function configurarAlerta(
  produtoId: number,
  monitorado: boolean,
  quantidadeMinima: number | null,
) {
  return requisitar<{ produto: Produto }>(`/despensa/produtos/${produtoId}/monitoramento`, {
    metodo: 'PUT',
    corpo: { monitorado, quantidadeMinima },
  });
}
