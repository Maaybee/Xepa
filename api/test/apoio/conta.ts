/**
 * Conta pronta para os testes dos outros módulos.
 *
 * Vai direto ao Repository em vez de passar por `POST /conta/cadastro`: o
 * cadastro real roda bcrypt com 12 rounds (RNF06), o que é o certo em produção
 * e caro demais para repetir a cada cenário de Despensa, Grana, Cabeça ou
 * Roupa. O fluxo de cadastro/login em si é coberto por `integracao/conta.test.ts`.
 *
 * A sessão é gravada do mesmo jeito que o SD02 gravaria: só o SHA-256 do token
 * vai para o banco (RNF07).
 */

import { TTL_SESSAO_MINUTOS } from './banco.js';
import type { Cliente } from './http.js';

export interface ContaDeTeste {
  id: number;
  email: string;
  token: string;
  /** Cliente já autenticado como esta conta. */
  cliente: Cliente;
}

let contador = 0;

export async function criarConta(cliente: Cliente, nome = 'Estudante'): Promise<ContaDeTeste> {
  const usuarioRepository = await import('../../src/repositories/usuarioRepository.js');
  const { gerarToken, hashToken, expiraEm } = await import('../../src/utils/token.js');

  contador += 1;
  const email = `teste${contador}@xepa.app`;

  const usuario = await usuarioRepository.salvar({
    nome,
    email,
    // Hash fixo de uma senha que nenhum teste usa; quem testa senha é o
    // módulo Conta, com o bcrypt real.
    senhaHash: '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Nq0LB0T0zAvKzZ7l0dPvWFPBW3W1B/a',
    salt: '$2b$12$C6UzMDM.H6dfI/f/IKcEe.',
  });

  const token = gerarToken();
  // O mesmo prazo que `resolverSessao` vai usar ao renovar — sem número mágico
  // repetido aqui, que era o que abria espaço para a sessão morrer no meio de
  // um cenário quando o ambiente definia um TTL menor.
  await usuarioRepository.registrarTokenSessao(
    usuario.id,
    hashToken(token),
    expiraEm(TTL_SESSAO_MINUTOS),
  );

  return { id: usuario.id, email, token, cliente: cliente.comToken(token) };
}

/** Reinicia a numeração dos e-mails junto com o TRUNCATE do banco. */
export function reiniciarContador(): void {
  contador = 0;
}
