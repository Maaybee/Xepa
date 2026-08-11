import { env, isProduction } from '../config/env.js';
import { AppError } from '../utils/errors.js';

/**
 * Integração com a Instituição de Ensino (ator secundário do SD17).
 *
 * Na prática a maioria das instituições não expõe integração, então este
 * adaptador nasce sem nenhuma implementação real: o caminho principal para as
 * notas é a entrada manual (RF024). Quando alguma instituição publicar uma
 * API, ela entra aqui como um novo caso — nada muda no CabecaService.
 */

export interface NotaImportada {
  materia: string;
  descricao: string;
  valor: number;
  peso: number;
  data: string;
}

/** 503: o vínculo está certo, quem não responde é a instituição. */
export const integracaoIndisponivel = (nomeInstituicao: string) =>
  new AppError(
    503,
    'INTEGRACAO_INDISPONIVEL',
    `${nomeInstituicao} não oferece importação automática de notas. ` +
      `Registre as notas manualmente por enquanto.`,
  );

export function integracaoDisponivel(): boolean {
  return env.instituicaoIntegracao === 'stub' && !isProduction;
}

/**
 * Busca as notas do aluno na instituição vinculada.
 *
 * Só existe o modo `stub`, ligado por INSTITUICAO_INTEGRACAO=stub fora de
 * produção: devolve um conjunto fixo de notas para deixar o SD17 testável
 * ponta a ponta sem depender de instituição nenhuma. É o mesmo arranjo do
 * envio de e-mail sem SMTP.
 */
export async function buscarNotas(
  instituicaoNome: string,
  _usuarioId: number,
): Promise<NotaImportada[]> {
  if (!integracaoDisponivel()) {
    throw integracaoIndisponivel(instituicaoNome);
  }

  return [
    { materia: 'Cálculo I', descricao: 'P1', valor: 7.5, peso: 2, data: '2026-04-10' },
    { materia: 'Cálculo I', descricao: 'P2', valor: 8.5, peso: 2, data: '2026-06-12' },
    { materia: 'Algoritmos', descricao: 'Projeto', valor: 9, peso: 3, data: '2026-05-20' },
  ];
}
