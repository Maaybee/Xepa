import bcrypt from 'bcrypt';

const ROUNDS = 12;

/** RN02 — mínimo 8 caracteres, com maiúscula, número e caractere especial. */
export const REGRAS_SENHA = [
  { teste: (s: string) => s.length >= 8, mensagem: 'ter no mínimo 8 caracteres' },
  { teste: (s: string) => /[A-ZÀ-Þ]/.test(s), mensagem: 'conter ao menos uma letra maiúscula' },
  { teste: (s: string) => /\d/.test(s), mensagem: 'conter ao menos um número' },
  {
    teste: (s: string) => /[^\p{L}\p{N}]/u.test(s),
    mensagem: 'conter ao menos um caractere especial',
  },
] as const;

/** Lista os requisitos da RN02 que a senha ainda não cumpre. */
export function validarSenha(senha: string): string[] {
  return REGRAS_SENHA.filter((regra) => !regra.teste(senha)).map((regra) => regra.mensagem);
}

/**
 * RNF06 — hash + salt, nunca texto puro.
 *
 * O bcrypt embute o salt no próprio hash; o salt é devolvido à parte só para
 * preencher a coluna `salt` prevista no ER.
 */
export async function gerarHash(senha: string): Promise<{ hash: string; salt: string }> {
  const salt = await bcrypt.genSalt(ROUNDS);
  const hash = await bcrypt.hash(senha, salt);
  return { hash, salt };
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
