/** Entidades do Módulo 5 — Roupa (lavanderia). */

export type StatusLavagem = 'agendada' | 'concluida' | 'cancelada';

export interface PecaRoupa {
  id: number;
  usuario_id: number;
  nome: string;
  tipo: string | null;
  limite_usos: number;
  usos_atuais: number;
  criado_em: Date;
}

export interface Lavagem {
  id: number;
  usuario_id: number;
  data_agendada: Date;
  status: StatusLavagem;
  lembrete_ativo: boolean;
}

export interface PecaView {
  id: number;
  nome: string;
  tipo: string | null;
  limiteUsos: number;
  usosAtuais: number;
  /** RN14 — a peça só entra na lista de "lavar" ao atingir o limite de usos. */
  precisaLavar: boolean;
  usosRestantes: number;
}

export function toPecaView(peca: PecaRoupa): PecaView {
  return {
    id: peca.id,
    nome: peca.nome,
    tipo: peca.tipo,
    limiteUsos: peca.limite_usos,
    usosAtuais: peca.usos_atuais,
    precisaLavar: precisaLavar(peca),
    usosRestantes: Math.max(0, peca.limite_usos - peca.usos_atuais),
  };
}

/** RN14 — atingiu o número de usos que o usuário definiu para aquela peça. */
export function precisaLavar(peca: { usos_atuais: number; limite_usos: number }): boolean {
  return peca.usos_atuais >= peca.limite_usos;
}

export interface LavagemView {
  id: number;
  dataAgendada: Date;
  status: StatusLavagem;
  lembreteAtivo: boolean;
  pecas: Array<{ id: number; nome: string }>;
}

/** RF033 / RN13 — insumo de lavanderia que está no estoque da despensa. */
export interface InsumoLavanderia {
  produtoId: number | null;
  nome: string;
  quantidadeAtual: number | null;
  unidade: string | null;
  /** `true` quando acabou, ou quando é monitorado e atingiu a mínima (RN08). */
  emFalta: boolean;
  /** `true` quando nem existe produto correspondente na despensa. */
  naoCadastrado: boolean;
}

export interface AlertaLavanderia {
  lavagensProximas: LavagemView[];
  insumos: InsumoLavanderia[];
  /** Insumos que faltam para as lavagens já agendadas. */
  faltando: string[];
  mensagem: string | null;
}
