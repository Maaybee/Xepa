/** Entidades do Open Finance (RF034–RF037, RN19–RN21). */

export type StatusConsentimento = 'pendente' | 'ativo' | 'expirado' | 'revogado';

export interface Consentimento {
  id: number;
  usuario_id: number;
  instituicao_financeira: string;
  /** Id no provedor autorizado — é por ele que se sincroniza e se revoga. */
  id_externo: string;
  escopo: string;
  status: StatusConsentimento;
  criado_em: Date;
  expira_em: Date;
  revogado_em: Date | null;
}

/** RN21 — só um consentimento vivo sincroniza. */
export function podeSincronizar(
  consentimento: Pick<Consentimento, 'status' | 'expira_em'>,
  agora: Date = new Date(),
): boolean {
  return consentimento.status === 'ativo' && new Date(consentimento.expira_em) > agora;
}

/**
 * RN21 — o status que o consentimento tem *de fato* agora.
 *
 * A expiração é passagem de tempo, não um evento: nada roda no vencimento para
 * mudar a linha no banco. Quem lê precisa derivar, senão um consentimento
 * vencido continua se dizendo ativo.
 */
export function statusEfetivo(
  consentimento: Pick<Consentimento, 'status' | 'expira_em'>,
  agora: Date = new Date(),
): StatusConsentimento {
  if (consentimento.status === 'revogado') return 'revogado';
  if (consentimento.status === 'ativo' && new Date(consentimento.expira_em) <= agora) {
    return 'expirado';
  }
  return consentimento.status;
}

/** Janela da RN20: a nota e o lançamento do banco não caem no mesmo dia. */
export const DIAS_DE_TOLERANCIA_NA_CONCILIACAO = 3;

export interface ResumoDaSincronizacao {
  /** Movimentações que viraram transação nova. */
  importadas: number;
  /** RN20 — casaram com uma nota fiscal que já existia. */
  conciliadas: number;
  /** RN19 — já tinham sido importadas antes. */
  ignoradas: number;
}
