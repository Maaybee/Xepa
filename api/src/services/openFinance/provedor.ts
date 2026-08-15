/**
 * A fronteira com o Open Finance (RNF18).
 *
 * O Xepa não é instituição participante: não tem registro no Diretório de
 * Participantes, nem certificado ICP-Brasil, nem mTLS. Quem fala com os bancos
 * é um provedor autorizado pelo Banco Central (um agregador como Pluggy, Belvo
 * ou Klavi).
 *
 * Esta interface é o contrato com esse provedor, e o Service só conhece ela.
 * Hoje quem a implementa é o simulador em `provedorSimulado.ts`; trocar por um
 * agregador de verdade é escrever outra implementação e mudar a linha que
 * escolhe qual usar — nada no Service muda.
 *
 * O que **nunca** atravessa esta fronteira: senha, token de banco ou qualquer
 * credencial do usuário. O usuário se autentica no ambiente da instituição; o
 * que volta para cá é o consentimento e os dados consentidos.
 */

export interface InstituicaoFinanceira {
  id: string;
  nome: string;
}

export interface ContaExterna {
  idExterno: string;
  nomeBanco: string;
  tipo: 'corrente' | 'poupanca' | 'pagamento';
  saldo: number;
}

export interface MovimentacaoExterna {
  idExterno: string;
  contaIdExterno: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  /** ISO `YYYY-MM-DD`. */
  data: string;
  descricao: string;
}

export interface ConsentimentoExterno {
  idExterno: string;
  /** Onde o usuário autoriza, no ambiente da instituição — fora do Xepa. */
  urlDeAutorizacao: string;
  expiraEm: Date;
}

export interface ProvedorOpenFinance {
  listarInstituicoes(): Promise<InstituicaoFinanceira[]>;

  /** SD25 — abre o consentimento e devolve para onde mandar o usuário. */
  iniciarConsentimento(
    instituicaoId: string,
    escopo: string,
  ): Promise<ConsentimentoExterno>;

  /**
   * SD25 — confirma que o usuário autorizou e devolve as contas destravadas.
   * Lança se o consentimento não tiver sido autorizado.
   */
  confirmarAutorizacao(idExterno: string): Promise<ContaExterna[]>;

  /** SD26 — movimentação das contas consentidas a partir de uma data. */
  listarMovimentacoes(idExterno: string, desde: string): Promise<MovimentacaoExterna[]>;

  /** SD27 — revoga do lado da instituição. */
  revogar(idExterno: string): Promise<void>;
}
