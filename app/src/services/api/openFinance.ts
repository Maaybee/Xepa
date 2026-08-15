/** Open Finance (SD25–SD27). Mora sob /grana: é automação financeira. */

import type {
  ConexaoOpenFinance,
  InstituicaoOpenFinance,
  ResumoDaSincronizacao,
} from '@/types/api';
import { requisitar } from './cliente';

export function listarInstituicoes() {
  return requisitar<{ instituicoes: InstituicaoOpenFinance[] }>(
    '/grana/open-finance/instituicoes',
  );
}

export function listarConexoes() {
  return requisitar<{ conexoes: ConexaoOpenFinance[] }>('/grana/open-finance/conexoes');
}

/** RF034 — abre o consentimento e devolve para onde mandar o usuário. */
export function criarConsentimento(instituicaoId: string) {
  return requisitar<{
    consentimento: { id: number; status: string; expira_em: string };
    urlDeAutorizacao: string;
  }>('/grana/open-finance/consentimentos', {
    metodo: 'POST',
    corpo: { instituicaoId },
  });
}

/**
 * Faz o papel da tela do banco, onde o usuário digitaria a senha — fora do Xepa
 * (RNF18). Só existe enquanto o provedor for o simulado; com um agregador real
 * o app abriria a `urlDeAutorizacao` no navegador e isto sairia.
 */
export function simularAutorizacao(consentimentoId: number) {
  return requisitar<void>(
    `/grana/open-finance/consentimentos/${consentimentoId}/simular-autorizacao`,
    { metodo: 'POST' },
  );
}

export function autorizarConsentimento(consentimentoId: number) {
  return requisitar<{ contas: unknown[] }>(
    `/grana/open-finance/consentimentos/${consentimentoId}/autorizar`,
    { metodo: 'POST' },
  );
}

/** RF035 — importa o extrato (RN19, RN20). */
export function sincronizar(consentimentoId: number) {
  return requisitar<{ resumo: ResumoDaSincronizacao }>(
    `/grana/open-finance/consentimentos/${consentimentoId}/sincronizar`,
    { metodo: 'POST' },
  );
}

/** RF036 — revoga. O histórico importado permanece (RN21). */
export function revogarConsentimento(consentimentoId: number) {
  return requisitar<void>(`/grana/open-finance/consentimentos/${consentimentoId}`, {
    metodo: 'DELETE',
  });
}
