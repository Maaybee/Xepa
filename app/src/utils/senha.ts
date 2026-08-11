/**
 * RN02 — as mesmas quatro exigências que `api/src/utils/senha.ts` aplica.
 *
 * Aqui a checagem existe só para dar retorno enquanto o usuário digita; quem
 * decide continua sendo o backend, que recusa o cadastro e devolve a lista do
 * que falta. As mensagens são idênticas às da API de propósito: a tela usa a
 * lista local e a do servidor no mesmo lugar.
 */

const REGRAS: Array<{ ok(senha: string): boolean; mensagem: string }> = [
  { ok: (s) => s.length >= 8, mensagem: 'ter no mínimo 8 caracteres' },
  { ok: (s) => /[A-ZÀ-Þ]/.test(s), mensagem: 'conter ao menos uma letra maiúscula' },
  { ok: (s) => /\d/.test(s), mensagem: 'conter ao menos um número' },
  { ok: (s) => /[^\p{L}\p{N}]/u.test(s), mensagem: 'conter ao menos um caractere especial' },
];

export function pendenciasDaSenha(senha: string): string[] {
  return REGRAS.filter((regra) => !regra.ok(senha)).map((regra) => regra.mensagem);
}
