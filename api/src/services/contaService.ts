import { env } from '../config/env.js';
import type { Avatar, Instituicao, PerfilPublico } from '../models/usuario.js';
import { toPerfilPublico } from '../models/usuario.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { badRequest, conflict, unauthorized } from '../utils/errors.js';
import { gerarHash, validarSenha, verificarSenha } from '../utils/senha.js';
import { expiraEm, gerarToken, hashToken } from '../utils/token.js';
import * as emailService from './emailService.js';

/**
 * Módulo 1 — Conta / Autenticação.
 * Implementa SD01 a SD05. Esta camada não conhece Express: erros de negócio
 * saem como AppError e viram HTTP no errorHandler.
 */

/** O e-mail é comparado e gravado sempre em minúsculas (RN01). */
function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ---------------------------------------------------------------------
// SD01 — Cadastro (RF001, RN01, RN02, RNF06)
// ---------------------------------------------------------------------

export interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
}

export async function cadastrar(dados: DadosCadastro): Promise<PerfilPublico> {
  // RN02 — a senha é validada antes de qualquer ida ao banco
  const pendencias = validarSenha(dados.senha);
  if (pendencias.length > 0) {
    throw badRequest(`A senha precisa ${pendencias.join(', ')}.`, { requisitos: pendencias });
  }

  const email = normalizarEmail(dados.email);

  // RN01 — e-mail único
  if (await usuarioRepository.buscarPorEmail(email)) {
    throw conflict('Já existe uma conta com esse e-mail.');
  }

  // RNF06 — hash + salt
  const { hash, salt } = await gerarHash(dados.senha);

  try {
    const usuario = await usuarioRepository.salvar({
      nome: dados.nome.trim(),
      email,
      senhaHash: hash,
      salt,
    });
    const criado = await usuarioRepository.buscarPorId(usuario.id);
    return toPerfilPublico(criado!);
  } catch (error) {
    // Duas requisições simultâneas com o mesmo e-mail passam pela checagem
    // acima; quem perde a corrida bate na constraint UNIQUE (RN01).
    if (isViolacaoUnica(error, 'usuario_email_key')) {
      throw conflict('Já existe uma conta com esse e-mail.');
    }
    throw error;
  }
}

function isViolacaoUnica(error: unknown, constraint: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === '23505' &&
    (error as { constraint?: string }).constraint === constraint
  );
}

// ---------------------------------------------------------------------
// SD02 — Login (RF002, RNF09)
// ---------------------------------------------------------------------

export interface SessaoAberta {
  token: string;
  expiraEm: Date;
  perfil: PerfilPublico;
}

export async function autenticar(emailInformado: string, senha: string): Promise<SessaoAberta> {
  const usuario = await usuarioRepository.buscarPorEmail(normalizarEmail(emailInformado));

  // Mesma resposta para "não existe" e "senha errada", para não revelar quais
  // e-mails têm conta. Quando o usuário não existe ainda assim gastamos um
  // bcrypt, para o tempo de resposta não denunciar a diferença.
  const hashParaComparar = usuario?.senha_hash ?? HASH_DESCARTAVEL;
  const senhaConfere = await verificarSenha(senha, hashParaComparar);

  if (!usuario || !senhaConfere) {
    throw unauthorized('E-mail ou senha incorretos.');
  }

  const token = gerarToken();
  const expira = expiraEm(env.sessionTtlMinutes);
  await usuarioRepository.registrarTokenSessao(usuario.id, hashToken(token), expira);

  return { token, expiraEm: expira, perfil: toPerfilPublico(usuario) };
}

/**
 * Hash de uma senha que não existe, usado só para igualar o tempo de resposta
 * do login quando o e-mail não está cadastrado.
 */
const HASH_DESCARTAVEL = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Nq0LB0T0zAvKzZ7l0dPvWFPBW3W1B/a';

// ---------------------------------------------------------------------
// SD03 — Logout (RF003, RN03)
// ---------------------------------------------------------------------

export async function encerrarSessao(token: string): Promise<void> {
  const usuario = await usuarioRepository.buscarPorTokenSessao(hashToken(token));
  if (!usuario) {
    throw unauthorized('Sessão inválida ou expirada.');
  }
  // RN03 — o token é invalidado no logout
  await usuarioRepository.invalidarTokenSessao(usuario.id);
}

/**
 * Resolve o token de uma requisição autenticada.
 *
 * RNF09 — a sessão morre com 30 minutos de inatividade; toda requisição
 * válida empurra a expiração para frente.
 */
export async function resolverSessao(token: string): Promise<PerfilPublico> {
  const usuario = await usuarioRepository.buscarPorTokenSessao(hashToken(token));
  if (!usuario) {
    throw unauthorized('Sessão inválida ou expirada.');
  }

  if (!usuario.token_sessao_expira_em || usuario.token_sessao_expira_em.getTime() <= Date.now()) {
    await usuarioRepository.invalidarTokenSessao(usuario.id);
    throw unauthorized('Sessão expirada por inatividade.');
  }

  await usuarioRepository.renovarSessao(usuario.id, expiraEm(env.sessionTtlMinutes));
  return toPerfilPublico(usuario);
}

// ---------------------------------------------------------------------
// SD04 — Recuperação de senha (RF005)
// ---------------------------------------------------------------------

/**
 * Sempre termina em sucesso, exista o e-mail ou não: a resposta genérica
 * impede descobrir quais e-mails têm conta.
 */
export async function solicitarRecuperacao(emailInformado: string): Promise<void> {
  const usuario = await usuarioRepository.buscarPorEmail(normalizarEmail(emailInformado));
  if (!usuario) return;

  const token = gerarToken();
  await usuarioRepository.salvarTokenRecuperacao(
    usuario.id,
    hashToken(token),
    expiraEm(env.resetTokenTtlMinutes),
  );

  try {
    await emailService.enviarRecuperacaoSenha(usuario.email, token);
  } catch (error) {
    // Uma falha do provedor de e-mail não pode virar pista de que a conta
    // existe: registramos e devolvemos a mesma resposta genérica.
    console.error('[conta] falha ao enviar e-mail de recuperação', error);
  }
}

export async function redefinirSenha(token: string, novaSenha: string): Promise<void> {
  const pendencias = validarSenha(novaSenha);
  if (pendencias.length > 0) {
    throw badRequest(`A senha precisa ${pendencias.join(', ')}.`, { requisitos: pendencias });
  }

  const usuario = await usuarioRepository.buscarPorTokenRecuperacao(hashToken(token));
  if (
    !usuario ||
    !usuario.token_recuperacao_expira_em ||
    usuario.token_recuperacao_expira_em.getTime() <= Date.now()
  ) {
    throw badRequest('Link de redefinição inválido ou expirado.');
  }

  const { hash, salt } = await gerarHash(novaSenha);
  await usuarioRepository.redefinirSenha(usuario.id, hash, salt);
}

// ---------------------------------------------------------------------
// SD05 — Perfil, avatar e vínculo institucional (RF004, RF006, RF007)
// ---------------------------------------------------------------------

/**
 * Campo ausente (`undefined`) significa "não mexer"; `null` desfaz o vínculo
 * de avatar ou instituição.
 */
export interface DadosPerfil {
  nome?: string | undefined;
  avatarId?: number | null | undefined;
  instituicaoId?: number | null | undefined;
}

export async function atualizarPerfil(
  usuarioId: number,
  dados: DadosPerfil,
): Promise<PerfilPublico> {
  // RN04 — o avatar tem que ser um dos pré-definidos
  if (dados.avatarId !== undefined && dados.avatarId !== null) {
    if (!(await usuarioRepository.avatarExiste(dados.avatarId))) {
      throw badRequest('Avatar inválido: escolha um da lista disponível.');
    }
  }

  // RN05 — o vínculo institucional precisa apontar para uma instituição real
  if (dados.instituicaoId !== undefined && dados.instituicaoId !== null) {
    if (!(await usuarioRepository.instituicaoExiste(dados.instituicaoId))) {
      throw badRequest('Instituição inválida.');
    }
  }

  if (dados.nome !== undefined && dados.nome.trim().length === 0) {
    throw badRequest('O nome não pode ficar em branco.');
  }

  const atualizado = await usuarioRepository.atualizarPerfil(usuarioId, {
    ...(dados.nome !== undefined ? { nome: dados.nome.trim() } : {}),
    ...(dados.avatarId !== undefined ? { avatarId: dados.avatarId } : {}),
    ...(dados.instituicaoId !== undefined ? { instituicaoId: dados.instituicaoId } : {}),
  });

  if (!atualizado) {
    throw unauthorized('Sessão inválida ou expirada.');
  }
  return toPerfilPublico(atualizado);
}

export async function obterPerfil(usuarioId: number): Promise<PerfilPublico> {
  const usuario = await usuarioRepository.buscarPorId(usuarioId);
  if (!usuario) {
    throw unauthorized('Sessão inválida ou expirada.');
  }
  return toPerfilPublico(usuario);
}

export async function listarAvatares(): Promise<Avatar[]> {
  return usuarioRepository.listarAvatares();
}

export async function listarInstituicoes(): Promise<Instituicao[]> {
  return usuarioRepository.listarInstituicoes();
}
