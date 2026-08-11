/** Entidades do Módulo 4 — Cabeça (estudos). */

export type MetodoMedia = 'simples' | 'ponderada';
export type OrigemAvaliacao = 'manual' | 'importada';

export interface Materia {
  id: number;
  usuario_id: number;
  nome: string;
  metodo_media: MetodoMedia;
  criado_em: Date;
}

export interface Avaliacao {
  id: number;
  materia_id: number;
  descricao: string;
  valor: number;
  peso: number;
  data: string;
  origem: OrigemAvaliacao;
}

export interface SessaoEstudo {
  id: number;
  materia_id: number;
  data: string;
  duracao_min: number;
}

export interface AvaliacaoView {
  id: number;
  descricao: string;
  valor: number;
  peso: number;
  data: string;
  origem: OrigemAvaliacao;
}

export interface SessaoView {
  id: number;
  data: string;
  duracaoMin: number;
}

export interface MateriaView {
  id: number;
  nome: string;
  metodoMedia: MetodoMedia;
  /** RN15 — `null` enquanto não houver nenhuma avaliação. */
  media: number | null;
  totalAvaliacoes: number;
  totalMinutosEstudo: number;
}

/**
 * RN15 — a média segue o método definido pelo usuário para aquela matéria.
 *
 * Na ponderada, cada nota pesa o que o usuário definiu; na simples, todas
 * pesam igual. Sem avaliações não existe média — devolve `null` em vez de
 * zero, que seria confundido com "tirou zero".
 */
export function calcularMedia(
  avaliacoes: Array<{ valor: number; peso: number }>,
  metodo: MetodoMedia,
): number | null {
  if (avaliacoes.length === 0) return null;

  if (metodo === 'ponderada') {
    const somaPesos = avaliacoes.reduce((total, a) => total + a.peso, 0);
    // Defensivo: o banco já exige peso > 0, então somaPesos nunca é zero.
    if (somaPesos === 0) return null;
    const somaPonderada = avaliacoes.reduce((total, a) => total + a.valor * a.peso, 0);
    return arredondar(somaPonderada / somaPesos);
  }

  const soma = avaliacoes.reduce((total, a) => total + a.valor, 0);
  return arredondar(soma / avaliacoes.length);
}

export type Tendencia = 'subindo' | 'estavel' | 'caindo' | 'indefinida';

/** RF027 / RN16 — evolução das notas de uma matéria ao longo do tempo. */
export interface Progressao {
  /** Cada avaliação em ordem cronológica, com a média até aquele ponto. */
  pontos: Array<{ data: string; descricao: string; valor: number; mediaAcumulada: number }>;
  primeira: number | null;
  ultima: number | null;
  /** Diferença entre a última e a primeira nota. */
  variacao: number | null;
  /**
   * Comparação entre a média da primeira metade das avaliações e a da segunda.
   * Com menos de duas avaliações não há o que comparar.
   */
  tendencia: Tendencia;
}

/** Margem abaixo da qual a variação é considerada estabilidade, não tendência. */
const MARGEM_ESTABILIDADE = 0.25;

export function calcularProgressao(
  avaliacoes: Array<{ data: string; descricao: string; valor: number; peso: number }>,
  metodo: MetodoMedia,
): Progressao {
  if (avaliacoes.length === 0) {
    return { pontos: [], primeira: null, ultima: null, variacao: null, tendencia: 'indefinida' };
  }

  const pontos = avaliacoes.map((avaliacao, indice) => ({
    data: avaliacao.data,
    descricao: avaliacao.descricao,
    valor: avaliacao.valor,
    mediaAcumulada: calcularMedia(avaliacoes.slice(0, indice + 1), metodo) ?? avaliacao.valor,
  }));

  const primeira = avaliacoes[0]!.valor;
  const ultima = avaliacoes[avaliacoes.length - 1]!.valor;

  if (avaliacoes.length < 2) {
    return { pontos, primeira, ultima, variacao: 0, tendencia: 'indefinida' };
  }

  const meio = Math.floor(avaliacoes.length / 2);
  const mediaInicio = calcularMedia(avaliacoes.slice(0, meio), metodo) ?? primeira;
  const mediaFim = calcularMedia(avaliacoes.slice(meio), metodo) ?? ultima;
  const diferenca = mediaFim - mediaInicio;

  return {
    pontos,
    primeira,
    ultima,
    variacao: arredondar(ultima - primeira),
    tendencia:
      Math.abs(diferenca) < MARGEM_ESTABILIDADE ? 'estavel' : diferenca > 0 ? 'subindo' : 'caindo',
  };
}

/** RF028 — estatísticas de tempo de estudo. */
export interface EstatisticasEstudo {
  totalSessoes: number;
  totalMinutos: number;
  mediaMinutosPorSessao: number;
  maiorSessaoMin: number;
  ultimaSessao: string | null;
  porMes: Array<{ mes: string; minutos: number; sessoes: number }>;
}

export function calcularEstatisticas(
  sessoes: Array<{ data: string; duracao_min: number }>,
): EstatisticasEstudo {
  if (sessoes.length === 0) {
    return {
      totalSessoes: 0,
      totalMinutos: 0,
      mediaMinutosPorSessao: 0,
      maiorSessaoMin: 0,
      ultimaSessao: null,
      porMes: [],
    };
  }

  const totalMinutos = sessoes.reduce((total, s) => total + s.duracao_min, 0);

  const meses = new Map<string, { minutos: number; sessoes: number }>();
  for (const sessao of sessoes) {
    const mes = sessao.data.slice(0, 7);
    const atual = meses.get(mes) ?? { minutos: 0, sessoes: 0 };
    meses.set(mes, { minutos: atual.minutos + sessao.duracao_min, sessoes: atual.sessoes + 1 });
  }

  return {
    totalSessoes: sessoes.length,
    totalMinutos,
    mediaMinutosPorSessao: Math.round(totalMinutos / sessoes.length),
    maiorSessaoMin: Math.max(...sessoes.map((s) => s.duracao_min)),
    ultimaSessao: sessoes.map((s) => s.data).sort().at(-1) ?? null,
    porMes: [...meses.entries()]
      .map(([mes, dados]) => ({ mes, ...dados }))
      .sort((a, b) => a.mes.localeCompare(b.mes)),
  };
}

/** SD20 — desempenho consolidado de uma matéria. */
export interface DesempenhoMateria {
  materia: { id: number; nome: string; metodoMedia: MetodoMedia };
  /** RF026 / RN15 */
  media: number | null;
  avaliacoes: AvaliacaoView[];
  /** RF027 / RN16 */
  progressao: Progressao;
  /** RF028 */
  estudo: EstatisticasEstudo;
}

export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
